/*
 * Server-side HumanVerify token flow.
 *
 *   1. Client POSTs /api/human/challenge → server returns
 *      { shapes: [...], target, challenge: signed_jwt_with_{nonce,target,exp} }
 *   2. Client renders puzzle, user drags dot to a shape, POSTs
 *      /api/human/verify { challenge, selected } → server verifies signature,
 *      checks selected===target, returns { verifyToken: signed_jwt_with_{nonce,exp} }
 *   3. Client passes verifyToken in the body of /api/auth/request-otp.
 *      The OTP endpoint runs `consumeVerifyToken(token)` before issuing a
 *      code — invalid/expired token => 401.
 *
 * Tokens are HS256-signed JWTs using HUMAN_VERIFY_SECRET. Single-use is
 * enforced *softly* via the very short TTL (30s on the verify token), which
 * is good enough alongside the existing per-identifier OTP rate limit.
 *
 * If HUMAN_VERIFY_SECRET is unset, the flow is permissive (fail-open) so dev
 * environments and the legacy client-only flow still work. Production
 * deploys should set the secret.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const CHALLENGE_TTL_MS = 120_000  // 2 min — user has time to drag
const VERIFY_TTL_MS = 30_000      // 30 s — must reach /api/auth/request-otp fast

export type Shape = 'circle' | 'square' | 'diamond'
const ALL_SHAPES: Shape[] = ['circle', 'square', 'diamond']

function getSecret(): Uint8Array | null {
  const s = process.env.HUMAN_VERIFY_SECRET
  if (!s) return null
  return new TextEncoder().encode(s)
}

function randomNonce(): string {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface ChallengePayload {
  challenge: string  // JWT
  shapes: Shape[]
  target: Shape
}

/** Issue a new challenge for the client. Server picks target; client must drop on it. */
export async function issueChallenge(): Promise<ChallengePayload> {
  const target = ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)]
  const shapes = [...ALL_SHAPES].sort(() => Math.random() - 0.5)
  const secret = getSecret()
  if (!secret) {
    // Fail-open in unconfigured envs: still return a "challenge" the verify
    // endpoint will accept (it also fail-opens). UI works either way.
    return { challenge: 'unsigned', shapes, target }
  }
  const challenge = await new SignJWT({ kind: 'hv-challenge', target, nonce: randomNonce() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() / 1000 + CHALLENGE_TTL_MS / 1000)
    .sign(secret)
  return { challenge, shapes, target }
}

/**
 * Verify the user's drop matches the challenge target. Returns a short-lived
 * verifyToken on success; throws on failure.
 */
export async function verifyDrop(challengeJwt: string, selected: string): Promise<{ verifyToken: string }> {
  const secret = getSecret()
  if (!secret) {
    // Permissive: issue an unsigned token; the consume side also accepts it.
    return { verifyToken: 'unsigned' }
  }
  if (!challengeJwt || !selected) throw new Error('Bad request')
  let payload: JWTPayload & { kind?: string; target?: string }
  try {
    const verified = await jwtVerify(challengeJwt, secret)
    payload = verified.payload
  } catch {
    throw new Error('Invalid challenge')
  }
  if (payload.kind !== 'hv-challenge' || !payload.target) throw new Error('Invalid challenge')
  if (selected !== payload.target) throw new Error('Wrong answer')

  const verifyToken = await new SignJWT({ kind: 'hv-verify', nonce: randomNonce() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() / 1000 + VERIFY_TTL_MS / 1000)
    .sign(secret)
  return { verifyToken }
}

/**
 * Validate a verify token in /api/auth/request-otp (or similar). Returns
 * true if valid (or if the secret isn't configured — fail-open). Returns
 * false for an invalid/expired token, so the caller can 401.
 */
export async function consumeVerifyToken(token: string | null | undefined): Promise<boolean> {
  const secret = getSecret()
  if (!secret) return true // fail-open if not configured
  if (!token) return false
  if (token === 'unsigned') return false
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.kind === 'hv-verify'
  } catch {
    return false
  }
}
