import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// POST /api/games — submit a completed game result.
// Guests are accepted with 200/{guest:true} so the client doesn't fail; we just
// don't record anything for them.
export async function POST(req: NextRequest) {
  try {
    const player = await requireAuth(req);
    const { room_code, winner_team, mode } = await req.json();

    if (!player) {
      // Guest game — accept but don't log.
      return NextResponse.json({ ok: true, guest: true });
    }

    const db = createClient();

    if (mode === 'online' && room_code) {
      // Online game — verify participation and update both players' W/L
      const { data: room } = await db
        .from('spitwars_rooms')
        .select('host_id, guest_id, status')
        .eq('code', room_code)
        .maybeSingle();

      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      if (room.host_id !== player.id && room.guest_id !== player.id) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
      }

      const isHost = room.host_id === player.id;
      const playerTeam = isHost ? 0 : 1;
      const won = winner_team === playerTeam;

      await db
        .from('spitwars_players')
        .update({ wins: won ? player.wins + 1 : player.wins, losses: won ? player.losses : player.losses + 1 })
        .eq('id', player.id);

      // Update opponent too (only if also authed)
      const opponentId = isHost ? room.guest_id : room.host_id;
      if (opponentId) {
        const { data: opp } = await db
          .from('spitwars_players')
          .select('wins, losses')
          .eq('id', opponentId)
          .single();
        if (opp) {
          await db
            .from('spitwars_players')
            .update({ wins: won ? opp.wins : opp.wins + 1, losses: won ? opp.losses + 1 : opp.losses })
            .eq('id', opponentId);
        }
      }
    } else if (mode === 'local') {
      // Solo (VS AI) game — player team is always 0 (LLAMAS); count wins
      const won = winner_team === 0;
      await db
        .from('spitwars_players')
        .update({
          wins: won ? player.wins + 1 : player.wins,
          losses: won ? player.losses : player.losses + 1,
        })
        .eq('id', player.id);
    }

    // Log to results table (best effort — silently skip if the table doesn't exist)
    await db.from('spitwars_game_results').insert({
      player_id: player.id,
      mode: mode ?? 'local',
      room_code: room_code ?? null,
      winner_team,
    }).then(() => null, () => null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[games POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/games — leaderboard
export async function GET() {
  try {
    const db = createClient();
    const { data: players, error } = await db
      .from('spitwars_players')
      .select('id, username, wins, losses, created_at')
      .order('wins', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    return NextResponse.json({ players: players ?? [] });
  } catch (err) {
    console.error('[games GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
