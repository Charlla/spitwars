import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET /api/rooms — list open rooms (status=waiting). Open to anyone, no auth.
export async function GET() {
  const db = createClient();
  const { data: rooms, error } = await db
    .from('spitwars_rooms')
    .select('id, code, host_id, host_name, status, created_at')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[rooms GET]', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }

  return NextResponse.json({ rooms: rooms ?? [] });
}

// POST /api/rooms — create a room. Either authed player OR guest with a name.
export async function POST(req: NextRequest) {
  // Online play (create/join rooms) requires a signed-in player. Guest
  // names are no longer accepted — sign in with OTP first.
  const player = await requireAuth(req);
  if (!player) {
    return NextResponse.json({ error: 'Sign in to play online.' }, { status: 401 });
  }

  const db = createClient();

  // Generate a unique 6-char code (no hardcoded names)
  let code = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await db
      .from('spitwars_rooms')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!existing) break;
    code = generateRoomCode();
    attempts++;
  }

  const { data: room, error } = await db
    .from('spitwars_rooms')
    .insert({
      code,
      host_id: player.id,
      host_name: player.username,
      status: 'waiting',
      game_state: null,
    })
    .select('id, code, host_id, host_name, status')
    .single();

  if (error || !room) {
    console.error('[rooms POST]', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }

  return NextResponse.json({ room }, { status: 201 });
}
