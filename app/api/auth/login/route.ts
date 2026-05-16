import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPassword } from '@/lib/password';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json({ error: 'login and password required' }, { status: 400 });
    }

    const db = createClient();
    const isEmail = login.includes('@');

    const { data: player } = await db
      .from('spitwars_players')
      .select('id, username, email, password_hash, wins, losses, created_at')
      .eq(isEmail ? 'email' : 'username', isEmail ? login.toLowerCase() : login)
      .maybeSingle();

    if (!player) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await verifyPassword(password, player.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { cookieHeader } = await createSession(player.id, req);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...safePlayer } = player;
    const res = NextResponse.json({ player: safePlayer });
    setSessionCookie(res, cookieHeader);
    return res;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
