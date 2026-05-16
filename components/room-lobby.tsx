'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionPlayer } from '@/lib/auth';

interface Room {
  id: string;
  code: string;
  host_id: string;
  host_name: string;
  guest_id?: string;
  guest_name?: string;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
}

interface RoomLobbyProps {
  player: SessionPlayer;
}

export function RoomLobby({ player }: RoomLobbyProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleCreateRoom = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.room) {
        router.push(`/online/${data.room.code}`);
      }
    } catch {
      // silent
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

  return (
    <div className="min-h-screen bg-[#060614] text-white font-mono p-4">
      {/* Header */}
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-2xl font-bold tracking-widest bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent">
              ONLINE
            </div>
            <div className="text-[10px] text-gray-500 tracking-widest">SPITWARS MULTIPLAYER</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">{player.username}</div>
            <div className="text-[10px] text-green-500">
              W{player.wins} / L{player.losses}
            </div>
          </div>
        </div>

        {/* Create + Join */}
        <div className="bg-white/[.03] border border-[#1e3a2f] rounded-xl p-4 flex flex-col gap-3 mb-4">
          <button
            onClick={handleCreateRoom}
            disabled={creating}
            className="w-full py-3 font-bold tracking-widest rounded-lg text-white disabled:opacity-50"
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
              className="flex-1 bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-white placeholder-gray-600 focus:border-cyan-700 focus:outline-none"
              maxLength={6}
            />
            <button
              onClick={() => handleJoinRoom(joinCode)}
              disabled={joining || joinCode.length < 6}
              className="px-4 py-2 font-bold rounded-lg text-white disabled:opacity-50 text-sm"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
            >
              {joining ? '...' : 'JOIN'}
            </button>
          </div>
          {joinError && <div className="text-red-400 text-[11px]">{joinError}</div>}
        </div>

        {/* Room list */}
        <div className="flex flex-col gap-2">
          <div className="text-[9px] text-gray-600 tracking-widest">OPEN ROOMS</div>

          {loading ? (
            <div className="text-gray-600 text-sm text-center py-8">Loading...</div>
          ) : rooms.length === 0 ? (
            <div className="text-gray-700 text-sm text-center py-8">
              No open rooms. Create one!
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white/[.02] border border-[#1e3a2f] rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold tracking-widest text-sm"
                      style={{ color: '#f97316' }}
                    >
                      {room.code}
                    </span>
                    <span className="text-gray-400 text-xs">{room.host_name}&apos;s room</span>
                  </div>
                  <div className="text-[9px] text-gray-600 mt-0.5">
                    {room.status === 'waiting' ? '1/2 — Waiting for player' : '2/2'}
                  </div>
                </div>
                {room.status === 'waiting' && room.host_id !== player.id && (
                  <button
                    onClick={() => handleJoinRoom(room.code)}
                    disabled={joining}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
                  >
                    JOIN
                  </button>
                )}
                {room.host_id === player.id && (
                  <button
                    onClick={() => router.push(`/online/${room.code}`)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg text-orange-400 border border-orange-800"
                  >
                    RESUME
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Nav */}
        <div className="mt-6 flex gap-3 justify-center text-[10px]">
          <a href="/" className="text-gray-600 hover:text-gray-400">HOME</a>
          <span className="text-gray-700">·</span>
          <a href="/game" className="text-gray-600 hover:text-gray-400">SOLO PLAY</a>
          <span className="text-gray-700">·</span>
          <a href="/leaderboard" className="text-gray-600 hover:text-gray-400">LEADERBOARD</a>
        </div>
      </div>
    </div>
  );
}
