import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

function cleanGuestName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
  if (cleaned.length < 2) return null;
  return cleaned;
}

// GET /api/rooms/[code] — get room state. Open to anyone.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = createClient();
  const { data: room, error } = await db
    .from('spitwars_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({ room });
}

// PATCH /api/rooms/[code] — join room OR update game state. Guest play allowed.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const player = await requireAuth(req);

  const db = createClient();
  const { data: room } = await db
    .from('spitwars_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const body = await req.json();

  // Identity for a guest action: prefer player session, else guest name from body
  const guestName = !player ? cleanGuestName(body?.guestName) : null;
  const myName = player ? player.username : guestName;

  // Join room (guest joins a waiting room)
  if (body.action === 'join') {
    if (!myName) {
      return NextResponse.json({ error: 'Need a guest name (or sign in)' }, { status: 400 });
    }
    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Room is not open' }, { status: 400 });
    }
    if (player && room.host_id === player.id) {
      return NextResponse.json({ error: 'You are the host' }, { status: 400 });
    }
    if (!player && room.host_name === myName) {
      return NextResponse.json({ error: 'You are the host' }, { status: 400 });
    }
    if (room.guest_id || room.guest_name) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 });
    }

    const { data: updated, error } = await db
      .from('spitwars_rooms')
      .update({
        guest_id: player ? player.id : null,
        guest_name: myName,
        status: 'playing',
        updated_at: new Date().toISOString(),
      })
      .eq('code', code.toUpperCase())
      .select('*')
      .single();

    if (error) {
      console.error('[rooms PATCH join]', error);
      return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
    }

    return NextResponse.json({ room: updated });
  }

  // Update game state (submit turn) — must be participant
  if (body.action === 'state') {
    const isParticipant = player
      ? room.host_id === player.id || room.guest_id === player.id
      : !!myName && (room.host_name === myName || room.guest_name === myName);

    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }
    if (!body.game_state) {
      return NextResponse.json({ error: 'game_state required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      game_state: body.game_state,
      updated_at: new Date().toISOString(),
    };

    if (body.game_state.winner !== null && body.game_state.winner !== undefined) {
      updateData.status = 'finished';
    }

    const { data: updated, error } = await db
      .from('spitwars_rooms')
      .update(updateData)
      .eq('code', code.toUpperCase())
      .select('*')
      .single();

    if (error) {
      console.error('[rooms PATCH state]', error);
      return NextResponse.json({ error: 'Failed to update game state' }, { status: 500 });
    }

    return NextResponse.json({ room: updated });
  }

  // Leave / close room
  if (body.action === 'leave') {
    if (player && room.host_id === player.id) {
      await db.from('spitwars_rooms').delete().eq('code', code.toUpperCase());
      return NextResponse.json({ ok: true });
    }
    if (!player && myName && room.host_name === myName) {
      await db.from('spitwars_rooms').delete().eq('code', code.toUpperCase());
      return NextResponse.json({ ok: true });
    }
    const guestMatches = player
      ? room.guest_id === player.id
      : !!myName && room.guest_name === myName;
    if (guestMatches) {
      const { data: updated } = await db
        .from('spitwars_rooms')
        .update({ guest_id: null, guest_name: null, status: 'waiting', updated_at: new Date().toISOString() })
        .eq('code', code.toUpperCase())
        .select('*')
        .single();
      return NextResponse.json({ room: updated });
    }
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
