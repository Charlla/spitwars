import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { otp, isValidEmail } from '@/lib/otp'
import { createSession, setSessionCookie } from '@/lib/auth'

function deriveUsername(email: string): string {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'llama'
}

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email.' }, { status: 400 })
    }
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 })
    }

    const ok = await otp.verifyEmailOTP(email, code)
    if (!ok) {
      return NextResponse.json({ error: 'Incorrect or expired code.' }, { status: 401 })
    }

    const normalised = email.trim().toLowerCase()
    const db = createClient()

    let { data: player } = await db
      .from('spitwars_players')
      .select('id, username, email, wins, losses, created_at')
      .eq('email', normalised)
      .maybeSingle()

    if (!player) {
      let username = deriveUsername(normalised)
      for (let i = 0; i < 5; i++) {
        const { data: clash } = await db
          .from('spitwars_players')
          .select('id')
          .eq('username', username)
          .maybeSingle()
        if (!clash) break
        username = `${deriveUsername(normalised)}${Math.floor(Math.random() * 9000) + 1000}`
      }
      const { data: created, error } = await db
        .from('spitwars_players')
        .insert({ email: normalised, username })
        .select('id, username, email, wins, losses, created_at')
        .single()
      if (error || !created) {
        console.error('[verify-otp] create player', error)
        return NextResponse.json({ error: 'Could not create account.' }, { status: 500 })
      }
      player = created
    }

    const { cookieHeader } = await createSession(player.id, req)
    const res = NextResponse.json({ ok: true, player })
    setSessionCookie(res, cookieHeader)
    return res
  } catch (err) {
    console.error('[verify-otp]', err)
    return NextResponse.json({ error: 'Verification failed. Try again.' }, { status: 500 })
  }
}
