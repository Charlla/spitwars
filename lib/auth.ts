/**
 * Spit Wars — BAB custom JWT auth
 * Cookie: spitwars_session (httpOnly, 30 days)
 * Tables: spitwars_players, spitwars_sessions
 * No Supabase Auth — custom bcrypt + session token pattern.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers as getHeaders } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
export const COOKIE_NAME = 'spitwars_session';

export interface SessionPlayer {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  wins: number;
  losses: number;
  created_at: string;
}

function generateRawToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('hex');
}

async function hashToken(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(digest).toString('hex');
}

export async function createSession(
  playerId: string,
  req: NextRequest
): Promise<{ token: string; cookieHeader: string }> {
  const db = createClient();
  const raw = generateRawToken();
  const token_hash = await hashToken(raw);
  const expires_at = new Date(Date.now() + SESSION_TTL_MS);

  const { error } = await db.from('spitwars_sessions').insert({
    player_id: playerId,
    token_hash,
    expires_at: expires_at.toISOString(),
    user_agent: req.headers.get('user-agent') ?? undefined,
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
  });

  if (error) throw error;

  const parts = [
    `${COOKIE_NAME}=${raw}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${expires_at.toUTCString()}`,
    `Max-Age=${SESSION_TTL_DAYS * 24 * 60 * 60}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');

  return { token: raw, cookieHeader: parts.join('; ') };
}

async function lookupSession(raw: string | undefined): Promise<SessionPlayer | null> {
  if (!raw) return null;
  try {
    const token_hash = await hashToken(raw);
    const db = createClient();

    const { data: session } = await db
      .from('spitwars_sessions')
      .select('player_id, expires_at')
      .eq('token_hash', token_hash)
      .single();

    if (!session) return null;
    if (new Date(session.expires_at) < new Date()) {
      await db.from('spitwars_sessions').delete().eq('token_hash', token_hash);
      return null;
    }

    const { data: player } = await db
      .from('spitwars_players')
      .select('id, username, email, display_name, wins, losses, created_at')
      .eq('id', session.player_id)
      .single();

    if (!player) return null;
    return player as SessionPlayer;
  } catch {
    return null;
  }
}

export async function getSessionPlayer(): Promise<SessionPlayer | null> {
  try {
    const reqHeaders = await getHeaders();
    const cookieHeader = reqHeaders.get('cookie') ?? '';
    const raw = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
      ?.slice(COOKIE_NAME.length + 1);
    return lookupSession(raw);
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<SessionPlayer | null> {
  const raw = req.cookies?.get?.(COOKIE_NAME)?.value;
  return lookupSession(raw);
}

export async function destroySession(req: NextRequest): Promise<void> {
  const raw = req.cookies?.get?.(COOKIE_NAME)?.value;
  if (!raw) return;
  try {
    const token_hash = await hashToken(raw);
    const db = createClient();
    await db.from('spitwars_sessions').delete().eq('token_hash', token_hash);
  } catch {
    // silent
  }
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`;
}

export function setSessionCookie(res: NextResponse, cookieHeader: string): void {
  res.headers.set('Set-Cookie', cookieHeader);
}
