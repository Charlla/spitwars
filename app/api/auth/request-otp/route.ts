import { NextRequest, NextResponse } from 'next/server'
import { otp, sendOTPEmail, isValidEmail, OTPRateLimitedError } from '@/lib/otp'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    const code = await otp.createEmailOTP(email)
    await sendOTPEmail(email.trim().toLowerCase(), code)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof OTPRateLimitedError) {
      return NextResponse.json(
        { error: 'Too many codes requested. Wait 15 min before trying again.' },
        { status: 429 },
      )
    }
    console.error('[request-otp]', err)
    return NextResponse.json({ error: 'Could not send code. Please try again.' }, { status: 500 })
  }
}
