import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/password';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'username, email and password required' }, { status: 400 });
    }
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'Username must be 3–20 characters' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, _ and -' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = createClient();

    // Check existing
    const { data: existing } = await db
      .from('spitwars_players')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Username or email already taken' }, { status: 409 });
    }

    const password_hash = await hashPassword(password);
    const { data: player, error } = await db
      .from('spitwars_players')
      .insert({ username, email: email.toLowerCase(), password_hash, wins: 0, losses: 0 })
      .select('id, username, email, wins, losses, created_at')
      .single();

    if (error || !player) {
      console.error('[register]', error);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    const { cookieHeader } = await createSession(player.id, req);
    const res = NextResponse.json({ player }, { status: 201 });
    setSessionCookie(res, cookieHeader);
    return res;
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
