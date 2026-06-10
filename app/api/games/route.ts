import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// POST /api/games — submit a completed game result.
export async function POST(req: NextRequest) {
  try {
    const player = await requireAuth(req);
    const { room_code, winner_team, mode } = await req.json();

    if (!player) {
      // Guest solo game — accept but don't log.
      return NextResponse.json({ ok: true, guest: true });
    }

    if (mode !== 'online' && mode !== 'local') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }
    if (winner_team !== 0 && winner_team !== 1) {
      return NextResponse.json({ error: 'Invalid winner_team' }, { status: 400 });
    }

    const db = createClient();
    let recordedWinner: number = winner_team;

    if (mode === 'online') {
      if (typeof room_code !== 'string' || !room_code) {
        return NextResponse.json({ error: 'room_code required' }, { status: 400 });
      }

      // Online game — verify participation, derive the winner from the room's
      // own final state (never trust the client's claim), and update both W/L.
      const { data: room } = await db
        .from('spitwars_rooms')
        .select('host_id, guest_id, status, game_state')
        .eq('code', room_code.toUpperCase())
        .maybeSingle();

      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      if (room.host_id !== player.id && room.guest_id !== player.id) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
      }

      const state = (room.game_state ?? {}) as Record<string, unknown>;
      const serverWinner = state.winner;
      if (room.status !== 'finished' || (serverWinner !== 0 && serverWinner !== 1)) {
        return NextResponse.json({ error: 'Game is not finished' }, { status: 409 });
      }
      // Idempotency: each finished game records stats exactly once (a rematch
      // resets game_state, clearing the flag).
      if (state.stats_recorded === true) {
        return NextResponse.json({ ok: true, already_recorded: true });
      }
      recordedWinner = serverWinner;

      const isHost = room.host_id === player.id;
      const playerTeam = isHost ? 0 : 1;
      const won = recordedWinner === playerTeam;

      // Mark recorded first (conditional update = cheap claim against a
      // double-submit race from both clients). The `stats_recorded is null`
      // filter ensures exactly one of the two submitters wins the claim.
      const { data: claimed } = await db
        .from('spitwars_rooms')
        .update({ game_state: { ...state, stats_recorded: true } })
        .eq('code', room_code.toUpperCase())
        .eq('status', 'finished')
        .is('game_state->stats_recorded', null)
        .select('id')
        .single();
      if (!claimed) {
        return NextResponse.json({ ok: true, already_recorded: true });
      }

      await db
        .from('spitwars_players')
        .update({ wins: won ? player.wins + 1 : player.wins, losses: won ? player.losses : player.losses + 1 })
        .eq('id', player.id);

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
    } else {
      // Solo (VS AI) game — player team is always 0 (LLAMAS); count wins
      const won = recordedWinner === 0;
      await db
        .from('spitwars_players')
        .update({
          wins: won ? player.wins + 1 : player.wins,
          losses: won ? player.losses : player.losses + 1,
        })
        .eq('id', player.id);
    }

    // Log to the results table (best effort — prod schema: player_id, mode,
    // room_code, winner_team, played_at; NOT spitwars_games, which has the
    // older player1/player2 shape).
    await db.from('spitwars_game_results').insert({
      player_id: player.id,
      mode,
      room_code: mode === 'online' ? room_code.toUpperCase() : null,
      winner_team: recordedWinner,
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
      .select('id, username, display_name, wins, losses, created_at')
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
