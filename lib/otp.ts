import { createClient } from '@/lib/supabase/server'
import { makeOTPFactory, renderOTPEmail, isValidEmail } from './otp-core'

export const otp = makeOTPFactory({
  table: 'spitwars_otp_codes',
  getDb: createClient,
})

export { renderOTPEmail, isValidEmail }
export { OTPRateLimitedError } from './otp-core'

const APP_NAME = 'Spitwars'
const BRAND = '#f97316'
// Use the verified Resend domain (botandbotty.com) for the default; spitwars.com
// is not verified with Resend so sending from it silently fails.
const FROM = process.env.EMAIL_FROM ?? 'Spitwars <noreply@botandbotty.com>'

export async function sendOTPEmail(email: string, code: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY missing')
  const { subject, html, text } = renderOTPEmail(APP_NAME, code, BRAND)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: email, subject, html, text }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend send failed: ${res.status} ${body.slice(0, 200)}`)
  }
}
