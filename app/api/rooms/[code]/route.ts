import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const ROOM_COLUMNS =
  'id, code, host_id, host_name, guest_id, guest_name, status, game_state, updated_at';

// Game-state snapshots are small (~terrain array + 4 units + projectiles).
// Cap well above normal size to reject abuse payloads.
const MAX_STATE_BYTES = 64 * 1024;

function validGameState(gs: unknown): gs is Record<string, unknown> {
  if (!gs || typeof gs !== 'object' || Array.isArray(gs)) return false;
  try {
    if (JSON.stringify(gs).length > MAX_STATE_BYTES) return false;
  } catch {
    return false;
  }
  const winner = (gs as Record<string, unknown>).winner;
  if (winner !== null && winner !== undefined && winner !== 0 && winner !== 1) return false;
  return true;
}

// GET /api/rooms/[code] — get room state. Open to anyone (codes are unguessable-ish
// 6-char tokens; the room view itself is shareable so spectating is fine).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = createClient();
  const { data: room, error } = await db
    .from('spitwars_rooms')
    .select(ROOM_COLUMNS)
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({ room });
}

// PATCH /api/rooms/[code] — join / update game state / rematch / leave.
// Sign-in required for every action: online multiplayer is OTP-gated, and
// identity comes from the session only (never a client-supplied name).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const player = await requireAuth(req);
  if (!player) {
    return NextResponse.json({ error: 'Sign in to play online.' }, { status: 401 });
  }

  const db = createClient();
  const upperCode = code.toUpperCase();
  const { data: room } = await db
    .from('spitwars_rooms')
    .select(ROOM_COLUMNS)
    .eq('code', upperCode)
    .maybeSingle();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const isHost = room.host_id === player.id;
  const isGuest = room.guest_id === player.id;
  const isParticipant = isHost || isGuest;

  // ── Join a waiting room ──────────────────────────────────────────────────
  if (body.action === 'join') {
    if (isHost) {
      return NextResponse.json({ error: 'You are the host' }, { status: 400 });
    }
    if (isGuest) {
      // Already in — idempotent rejoin (e.g. after a reload mid-join).
      return NextResponse.json({ room });
    }
    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Room is not open' }, { status: 400 });
    }
    if (room.guest_id) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 });
    }

    const { data: updated, error } = await db
      .from('spitwars_rooms')
      .update({
        guest_id: player.id,
        guest_name: player.display_name?.trim() || player.username,
        status: 'playing',
        updated_at: new Date().toISOString(),
      })
      .eq('code', upperCode)
      .eq('status', 'waiting')
      .is('guest_id', null) // guard against two players joining at once
      .select(ROOM_COLUMNS)
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'Room is no longer open' }, { status: 409 });
    }

    return NextResponse.json({ room: updated });
  }

  // Everything below requires being one of the two players in the room.
  if (!isParticipant) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }

  // ── Update game state (submit turn) ──────────────────────────────────────
  if (body.action === 'state') {
    if (room.status !== 'playing') {
      return NextResponse.json({ error: 'Game is not in progress' }, { status: 400 });
    }
    if (!validGameState(body.game_state)) {
      return NextResponse.json({ error: 'Invalid game_state' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      game_state: body.game_state,
      updated_at: new Date().toISOString(),
    };

    const winner = (body.game_state as Record<string, unknown>).winner;
    if (winner === 0 || winner === 1) {
      updateData.status = 'finished';
    }

    const { data: updated, error } = await db
      .from('spitwars_rooms')
      .update(updateData)
      .eq('code', upperCode)
      .select(ROOM_COLUMNS)
      .single();

    if (error) {
      console.error('[rooms PATCH state]', error);
      return NextResponse.json({ error: 'Failed to update game state' }, { status: 500 });
    }

    return NextResponse.json({ room: updated });
  }

  // ── Rematch — reset a finished room for another round ────────────────────
  if (body.action === 'rematch') {
    if (room.status !== 'finished') {
      return NextResponse.json({ error: 'Game is not finished yet' }, { status: 400 });
    }
    if (!room.guest_id) {
      return NextResponse.json({ error: 'Opponent has left' }, { status: 400 });
    }

    const { data: updated, error } = await db
      .from('spitwars_rooms')
      .update({
        game_state: null, // host re-seeds a fresh battlefield
        status: 'playing',
        updated_at: new Date().toISOString(),
      })
      .eq('code', upperCode)
      .eq('status', 'finished')
      .select(ROOM_COLUMNS)
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'Could not start rematch' }, { status: 409 });
    }

    return NextResponse.json({ room: updated });
  }

  // ── Leave / close room ───────────────────────────────────────────────────
  if (body.action === 'leave') {
    if (isHost) {
      await db.from('spitwars_rooms').delete().eq('code', upperCode);
      return NextResponse.json({ ok: true });
    }
    // Guest leaving: reopen the room if mid-game, otherwise just vacate the slot.
    const { data: updated } = await db
      .from('spitwars_rooms')
      .update({
        guest_id: null,
        guest_name: null,
        status: 'waiting',
        game_state: null,
        updated_at: new Date().toISOString(),
      })
      .eq('code', upperCode)
      .select(ROOM_COLUMNS)
      .single();
    return NextResponse.json({ room: updated });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
