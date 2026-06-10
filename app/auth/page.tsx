'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { HumanVerify } from '@/components/games/HumanVerify'

type Step = 'email' | 'code'

// Only allow same-site relative paths — never an absolute URL (open redirect).
function safeNext(raw: string | null): string {
  // `/\evil.com` is treated as `//evil.com` by browsers — block backslash too.
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  return raw
}

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNext(searchParams.get('next'))
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyToken, setVerifyToken] = useState<string | null>(null)
  const [humanKey, setHumanKey] = useState(0) // remount HumanVerify for resend
  const humanOk = !!verifyToken
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (step === 'code') codeRef.current?.focus() }, [step])

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    setNotice('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), verifyToken }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Could not send code.')
      else {
        // The human-verify token is single-use — a resend needs a fresh one.
        setVerifyToken(null)
        setStep('code')
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  function resendCode() {
    // Token already consumed — go back for a fresh human check.
    setVerifyToken(null)
    setHumanKey((k) => k + 1)
    setCode('')
    setError('')
    setStep('email')
    setNotice('Quick human check again, then we’ll send a fresh code.')
  }

  async function verifyCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your email.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Verification failed.')
      else {
        router.push(nextPath)
        router.refresh()
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-game-deep px-4 text-game-ink">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1
            className="select-none text-3xl font-extrabold leading-none tracking-tight font-mono"
            style={{
              background: 'linear-gradient(135deg, var(--game-accent) 0%, var(--game-accent-2) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            SPITWARS
          </h1>
          <p className="mt-2 text-[11px] font-mono uppercase tracking-[4px] text-game-ink-muted">Sign in</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={requestCode} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs uppercase tracking-[3px] text-game-ink-muted font-mono mb-2">Email</label>
              <input
                id="auth-email"
                type="email" inputMode="email" autoComplete="email" autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-game-md border border-game-border bg-game-surface px-4 py-3 text-base text-game-ink outline-none placeholder:text-game-ink-faint focus:border-game-accent"
              />
            </div>
            <HumanVerify key={humanKey} onVerified={(t) => setVerifyToken(t)} />
            {notice && <div className="rounded-game-sm bg-game-info/10 text-game-info px-3 py-2 text-xs" role="status">{notice}</div>}
            {error && <div className="rounded-game-sm bg-game-danger/15 text-game-danger px-3 py-2 text-xs" role="alert">{error}</div>}
            <button
              type="submit"
              disabled={loading || !humanOk}
              className="w-full inline-flex items-center justify-center h-12 rounded-game-pill font-mono font-black uppercase tracking-[4px] text-sm text-game-deep shadow-game-glow-md disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--game-accent), color-mix(in oklab, var(--game-accent) 50%, var(--game-accent-2)))' }}
              title={!humanOk ? 'Complete the human check first' : undefined}
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
            <p className="mt-6 text-center text-xs text-game-ink-faint">
              <Link href="/" className="hover:text-game-ink">← Back to game</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-center text-sm text-game-ink-muted">
              We sent a 6-digit code to <span className="text-game-ink">{email}</span>
            </p>
            <div>
              <label htmlFor="auth-code" className="block text-xs uppercase tracking-[3px] text-game-ink-muted font-mono mb-2">Code</label>
              <input
                id="auth-code"
                ref={codeRef}
                type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-game-md border border-game-border bg-game-surface px-4 py-3 text-center text-2xl font-mono tracking-[10px] text-game-ink outline-none placeholder:text-game-ink-faint focus:border-game-accent"
              />
            </div>
            {error && <div className="rounded-game-sm bg-game-danger/15 text-game-danger px-3 py-2 text-xs" role="alert">{error}</div>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full inline-flex items-center justify-center h-12 rounded-game-pill font-mono font-black uppercase tracking-[4px] text-sm text-game-deep shadow-game-glow-md disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--game-accent), color-mix(in oklab, var(--game-accent) 50%, var(--game-accent-2)))' }}
            >
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <div className="flex items-center justify-between gap-2 text-xs">
              <button type="button" onClick={resendCode} className="min-h-11 px-1 text-game-ink-muted hover:text-game-ink">← Use a different email</button>
              <button type="button" onClick={resendCode} disabled={loading} className="min-h-11 px-1 text-game-accent hover:underline disabled:opacity-60">Resend code</button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-svh items-center justify-center bg-game-deep px-4 text-game-ink font-mono text-sm">
        Loading…
      </main>
    }>
      <AuthForm />
    </Suspense>
  )
}
