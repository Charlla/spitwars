/*
 * BAB OTP core (canonical copy). Edit /home/charl/code/bab/lib/auth/otp/core.ts
 * then re-copy.
 */

import bcrypt from 'bcryptjs'

type SupabaseLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

export interface OTPFactoryConfig {
  table: string
  getDb: () => SupabaseLike
  ttlMinutes?: number
  rateLimitCount?: number
  rateLimitWindowMinutes?: number
}

export interface OTPClient {
  generateCode: () => string
  createEmailOTP: (email: string) => Promise<string>
  verifyEmailOTP: (email: string, code: string) => Promise<boolean>
  createCellOTP: (cell: string) => Promise<string>
  verifyCellOTP: (cell: string, code: string) => Promise<boolean>
}

export class OTPRateLimitedError extends Error {
  constructor() { super('RATE_LIMITED'); this.name = 'OTPRateLimitedError' }
}

function generateCode(): string {
  const arr = new Uint8Array(4)
  crypto.getRandomValues(arr)
  return (new DataView(arr.buffer).getUint32(0) % 1_000_000).toString().padStart(6, '0')
}

const normaliseEmail = (e: string) => e.trim().toLowerCase()

export function makeOTPFactory(cfg: OTPFactoryConfig): OTPClient {
  const ttlMs = (cfg.ttlMinutes ?? 10) * 60 * 1000
  const rateMax = cfg.rateLimitCount ?? 5
  const rateWindowMs = (cfg.rateLimitWindowMinutes ?? 15) * 60 * 1000

  async function checkRate(field: 'email' | 'cell', value: string) {
    const db = cfg.getDb()
    const windowStart = new Date(Date.now() - rateWindowMs).toISOString()
    const { count } = await db.from(cfg.table).select('*', { count: 'exact', head: true }).eq(field, value).gte('created_at', windowStart)
    if ((count ?? 0) >= rateMax) throw new OTPRateLimitedError()
  }

  async function issue(field: 'email' | 'cell', value: string): Promise<string> {
    await checkRate(field, value)
    const code = generateCode()
    const code_hash = await bcrypt.hash(code, 10)
    const expires_at = new Date(Date.now() + ttlMs).toISOString()
    const { error } = await cfg.getDb().from(cfg.table).insert({ [field]: value, code_hash, expires_at })
    if (error) throw error
    return code
  }

  async function verify(field: 'email' | 'cell', value: string, code: string): Promise<boolean> {
    if (!/^\d{6}$/.test(code)) return false
    const db = cfg.getDb()
    const { data: rows } = await db.from(cfg.table).select('id, code_hash').eq(field, value).eq('used', false).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1)
    const row = rows?.[0]
    if (!row) return false
    const match = await bcrypt.compare(code, row.code_hash)
    if (!match) return false
    await db.from(cfg.table).update({ used: true }).eq('id', row.id)
    return true
  }

  return {
    generateCode,
    createEmailOTP: (email) => issue('email', normaliseEmail(email)),
    verifyEmailOTP: (email, code) => verify('email', normaliseEmail(email), code),
    createCellOTP:  (cell) => issue('cell', cell),
    verifyCellOTP:  (cell, code) => verify('cell', cell, code),
  }
}

export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export function renderOTPEmail(appName: string, code: string, brandColor = '#f97316'): { subject: string; html: string; text: string } {
  const subject = `${appName} sign-in code: ${code}`
  const text = `Your ${appName} sign-in code is ${code}\n\nThis code expires in 10 minutes.\n`
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#060614;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f5f5f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
<tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#16162e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">
<tr><td style="padding:32px;text-align:center;">
<h1 style="margin:0;font-size:28px;color:${brandColor};font-weight:900;letter-spacing:-0.01em;text-transform:uppercase;">${appName}</h1>
<p style="margin:18px 0 4px;font-size:13px;color:rgba(245,245,240,.6);">Your sign-in code</p>
<div style="font-family:ui-monospace,Menlo,monospace;font-size:42px;letter-spacing:12px;font-weight:800;color:${brandColor};padding:18px;background:#060614;border-radius:12px;display:inline-block;margin:8px 0 20px;">${code}</div>
<p style="margin:0;font-size:11px;color:rgba(245,245,240,.45);line-height:1.6;">Expires in 10 minutes. Single use.<br/>Didn't request this? You can safely ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`
  return { subject, html, text }
}
