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

function cleanGuestName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
  if (cleaned.length < 2) return null;
  return cleaned;
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
  const player = await requireAuth(req);

  let guestName: string | null = null;
  if (!player) {
    try {
      const body = await req.json();
      guestName = cleanGuestName(body?.guestName);
    } catch {
      // body might be empty
    }
    if (!guestName) {
      return NextResponse.json({ error: 'Need a guest name (or sign in)' }, { status: 400 });
    }
  }

  const db = createClient();

  // Generate a unique 6-char code
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
      host_id: player ? player.id : null,
      host_name: player ? player.username : guestName!,
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
