import { NextRequest, NextResponse } from 'next/server'
import { otp, sendOTPEmail, isValidEmail, OTPRateLimitedError } from '@/lib/otp'
import { consumeVerifyToken } from '@/lib/security/human-verify'

export async function POST(req: NextRequest) {
  try {
    const { email, verifyToken } = await req.json()
    if (!email || !isValidEmail(email)) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 200))
      return NextResponse.json({ ok: true })
    }
    if (!(await consumeVerifyToken(verifyToken))) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 200))
      return NextResponse.json({ ok: true })
    }
    const code = await otp.createEmailOTP(email)
    await sendOTPEmail(email.trim().toLowerCase(), code)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof OTPRateLimitedError) {
      return NextResponse.json({ error: 'Too many codes requested. Wait 15 min.' }, { status: 429 })
    }
    console.error('[spitwars request-otp]', err)
    return NextResponse.json({ ok: true })
  }
}
