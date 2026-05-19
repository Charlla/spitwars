import { NextResponse } from 'next/server'

// Disabled: registration happens automatically on OTP verification.
// See /api/auth/verify-otp.
export async function POST() {
  return NextResponse.json(
    { error: 'Registration via password is disabled. Use OTP sign-in instead.' },
    { status: 410 },
  )
}
