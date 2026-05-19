'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HumanVerify } from '@/components/games/HumanVerify'

type Step = 'email' | 'code'

export default function AuthPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [humanOk, setHumanOk] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (step === 'code') codeRef.current?.focus() }, [step])

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Could not send code.')
      else setStep('code')
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
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
      else router.push('/')
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
              <label className="block text-xs uppercase tracking-[3px] text-game-ink-muted font-mono mb-2">Email</label>
              <input
                type="email" inputMode="email" autoComplete="email" autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-game-md border border-game-border bg-game-surface px-4 py-3 text-base text-game-ink outline-none placeholder:text-game-ink-faint focus:border-game-accent"
              />
            </div>
            <HumanVerify onVerified={() => setHumanOk(true)} />
            {error && <div className="rounded-game-sm bg-game-danger/15 text-game-danger px-3 py-2 text-xs">{error}</div>}
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
              <label className="block text-xs uppercase tracking-[3px] text-game-ink-muted font-mono mb-2">Code</label>
              <input
                ref={codeRef}
                type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-game-md border border-game-border bg-game-surface px-4 py-3 text-center text-2xl font-mono tracking-[10px] text-game-ink outline-none placeholder:text-game-ink-faint focus:border-game-accent"
              />
            </div>
            {error && <div className="rounded-game-sm bg-game-danger/15 text-game-danger px-3 py-2 text-xs">{error}</div>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full inline-flex items-center justify-center h-12 rounded-game-pill font-mono font-black uppercase tracking-[4px] text-sm text-game-deep shadow-game-glow-md disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--game-accent), color-mix(in oklab, var(--game-accent) 50%, var(--game-accent-2)))' }}
            >
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => { setStep('email'); setCode(''); setError('') }} className="text-game-ink-muted hover:text-game-ink">← Use a different email</button>
              <button type="button" onClick={() => requestCode()} disabled={loading} className="text-game-accent hover:underline disabled:opacity-60">Resend code</button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
