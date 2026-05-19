'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionPlayer } from '@/lib/auth';

interface Room {
  id: string;
  code: string;
  host_id: string | null;
  host_name: string;
  guest_id?: string | null;
  guest_name?: string | null;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
}

interface RoomLobbyProps {
  // null = not signed in; online play requires sign-in
  player: (SessionPlayer & { display_name?: string | null }) | null;
}

export function RoomLobby({ player }: RoomLobbyProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // Display-name capture for first-time players (no display_name set yet)
  const needsDisplayName = !!player && !player.display_name?.trim();
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const profileComplete = profileSaved || !needsDisplayName;

  const displayName = player?.display_name?.trim() || player?.username || 'Player';

  async function handleSaveProfile(e?: React.FormEvent) {
    e?.preventDefault();
    const cleaned = displayNameInput.trim().slice(0, 30);
    if (cleaned.length < 2) {
      setProfileError('Display name must be at least 2 characters.');
      return;
    }
    setSavingProfile(true);
    setProfileError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error ?? 'Could not save profile.');
        return;
      }
      setProfileSaved(true);
    } catch {
      setProfileError('Network error');
    } finally {
      setSavingProfile(false);
    }
  }

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!player || !profileComplete) return;
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms, player, profileComplete]);

  const handleCreateRoom = async () => {
    setCreating(true);
    setJoinError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        router.push(`/online/${data.room.code}`);
      } else {
        setJoinError(data.error ?? 'Could not create room');
      }
    } catch {
      setJoinError('Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (code: string) => {
    if (!code.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const upperCode = code.trim().toUpperCase();
      const res = await fetch(`/api/rooms/${upperCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/online/${upperCode}`);
      } else {
        setJoinError(data.error ?? 'Could not join room');
      }
    } catch {
      setJoinError('Network error');
    } finally {
      setJoining(false);
    }
  };

  // ── 1. Not signed in → sign-in CTA ───────────────────────────────────────
  if (!player) {
    return (
      <div className="min-h-screen bg-game-deep text-game-ink font-mono p-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-2xl font-bold tracking-widest bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent">
            ONLINE
          </div>
          <div className="text-[10px] text-game-ink-muted tracking-widest">SPITWARS MULTIPLAYER</div>
          <p className="text-sm text-game-ink-muted mt-6">
            Online play requires sign-in so we can pair you with other players and save your stats.
          </p>
          <a
            href="/auth"
            className="inline-flex items-center justify-center w-full h-12 rounded-game-pill font-mono font-black uppercase tracking-[4px] text-sm text-game-deep shadow-game-glow-md"
            style={{ background: 'linear-gradient(135deg, var(--game-accent), color-mix(in oklab, var(--game-accent) 50%, var(--game-accent-2)))' }}
          >
            Sign in to play online
          </a>
          <a href="/game" className="block text-[11px] text-game-ink-faint hover:text-game-ink-muted">
            ← back to solo play
          </a>
        </div>
      </div>
    );
  }

  // ── 2. First-time signed-in user → capture display name ──────────────────
  if (!profileComplete) {
    return (
      <div className="min-h-screen bg-game-deep text-game-ink font-mono p-4 flex items-center justify-center">
        <form onSubmit={handleSaveProfile} className="max-w-md w-full space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold tracking-widest bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent">
              ALMOST IN
            </div>
            <div className="text-[10px] text-game-ink-muted tracking-widest mt-1">PICK A DISPLAY NAME</div>
          </div>
          <p className="text-sm text-game-ink-muted text-center">
            This is the name other players will see in rooms and on leaderboards.
          </p>
          <div>
            <label className="block text-xs uppercase tracking-[3px] text-game-ink-muted mb-2">Display name</label>
            <input
              autoFocus
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="GeraldTheLlama"
              maxLength={30}
              className="w-full rounded-game-md border border-game-border bg-game-surface px-4 py-3 text-base text-game-ink outline-none placeholder:text-game-ink-faint focus:border-game-accent"
            />
          </div>
          {profileError && <p className="text-game-danger text-xs">{profileError}</p>}
          <button
            type="submit"
            disabled={savingProfile || displayNameInput.trim().length < 2}
            className="w-full h-12 rounded-game-pill font-mono font-black uppercase tracking-[4px] text-sm text-game-deep shadow-game-glow-md disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--game-accent), color-mix(in oklab, var(--game-accent) 50%, var(--game-accent-2)))' }}
          >
            {savingProfile ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    );
  }

  // ── 3. Authed + profile complete → lobby ─────────────────────────────────
  return (
    <div className="min-h-screen bg-game-deep text-game-ink font-mono p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-widest bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent">
              ONLINE
            </div>
            <div className="text-[10px] text-game-ink-faint tracking-widest">SPITWARS MULTIPLAYER</div>
          </div>
          <div className="text-right ml-2 min-w-0">
            <div className="text-sm text-game-ink-muted truncate">{displayName}</div>
            <div className="text-[10px] text-game-success">W{player.wins} / L{player.losses}</div>
          </div>
        </div>

        <div className="bg-game-surface/40 border border-game-border rounded-xl p-4 flex flex-col gap-3 mb-4">
          <button
            onClick={handleCreateRoom}
            disabled={creating}
            className="w-full py-3 font-bold tracking-widest rounded-lg text-game-ink disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}
          >
            {creating ? 'CREATING...' : '+ CREATE ROOM'}
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ENTER CODE"
              className="flex-1 bg-game-bg/60 border border-game-border rounded-lg px-3 py-2 text-base font-mono tracking-widest text-game-ink placeholder:text-game-ink-faint focus:border-game-accent focus:outline-none"
              maxLength={6}
            />
            <button
              onClick={() => handleJoinRoom(joinCode)}
              disabled={joining || joinCode.length < 6}
              className="px-4 py-2 font-bold rounded-lg text-game-ink disabled:opacity-50 text-sm"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
            >
              {joining ? '...' : 'JOIN'}
            </button>
          </div>
          {joinError && <div className="text-game-danger text-[11px]">{joinError}</div>}
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[9px] text-game-ink-faint tracking-widest">OPEN ROOMS</div>
          {loading ? (
            <div className="text-game-ink-faint text-sm text-center py-8">Loading...</div>
          ) : rooms.length === 0 ? (
            <div className="text-game-ink-faint text-sm text-center py-8">No open rooms. Create one!</div>
          ) : (
            rooms.map((room) => {
              const isMine = !!(player && room.host_id === player.id);
              return (
                <div
                  key={room.id}
                  className="bg-game-surface/30 border border-game-border rounded-lg p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold tracking-widest text-sm text-game-accent">{room.code}</span>
                      <span className="text-game-ink-muted text-xs truncate">{room.host_name}&apos;s room</span>
                    </div>
                    <div className="text-[9px] text-game-ink-faint mt-0.5">
                      {room.status === 'waiting' ? '1/2 — Waiting for player' : '2/2'}
                    </div>
                  </div>
                  {room.status === 'waiting' && !isMine && (
                    <button
                      onClick={() => handleJoinRoom(room.code)}
                      disabled={joining}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg text-game-ink disabled:opacity-50 flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
                    >
                      JOIN
                    </button>
                  )}
                  {isMine && (
                    <button
                      onClick={() => router.push(`/online/${room.code}`)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg text-game-accent border border-game-accent/60 flex-shrink-0"
                    >
                      RESUME
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 flex gap-3 justify-center text-[10px] flex-wrap">
          <a href="/" className="text-game-ink-faint hover:text-game-ink-muted">HOME</a>
          <span className="text-game-ink-faint">·</span>
          <a href="/game" className="text-game-ink-faint hover:text-game-ink-muted">SOLO PLAY</a>
          <span className="text-game-ink-faint">·</span>
          <a href="/leaderboard" className="text-game-ink-faint hover:text-game-ink-muted">LEADERBOARD</a>
        </div>
      </div>
    </div>
  );
}
