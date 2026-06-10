import Link from 'next/link';
import { getSessionPlayer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

interface Player {
  id: string;
  username: string;
  display_name: string | null;
  wins: number;
  losses: number;
  created_at: string;
}

export const revalidate = 60;

export default async function LeaderboardPage() {
  const player = await getSessionPlayer();
  const db = createClient();
  const { data: players } = await db
    .from('spitwars_players')
    .select('id, username, display_name, wins, losses, created_at')
    .order('wins', { ascending: false })
    .limit(50);

  const rows = (players ?? []) as Player[];

  return (
    <div className="min-h-screen bg-[#060614] text-white font-mono p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-2xl font-bold tracking-widest bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent">
              LEADERBOARD
            </div>
            <div className="text-[10px] text-gray-600 tracking-widest">TOP SPITTERS</div>
          </div>
          {player && (
            <div className="text-right">
              <div className="text-sm text-gray-400">{player.display_name?.trim() || player.username}</div>
              <div className="text-[10px] text-green-500">W{player.wins} / L{player.losses}</div>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="text-center text-gray-700 py-16">
            <div className="text-4xl mb-4">💦</div>
            <div>No battles recorded yet.</div>
            <div className="text-[11px] text-gray-800 mt-2">Be the first!</div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {rows.map((p, i) => {
              const isMe = player?.id === p.id;
              const winRate = p.wins + p.losses > 0
                ? Math.round((p.wins / (p.wins + p.losses)) * 100)
                : 0;

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{
                    background: isMe ? 'rgba(249,115,22,.08)' : 'rgba(255,255,255,.02)',
                    border: `1px solid ${isMe ? '#f9731644' : '#1e3a2f'}`,
                  }}
                >
                  {/* Rank */}
                  <div
                    className="text-xs font-bold w-6 text-center flex-shrink-0"
                    style={{
                      color: i === 0 ? '#fbbf24' : i === 1 ? '#d1d5db' : i === 2 ? '#cd7f32' : '#4b5563',
                    }}
                  >
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-bold truncate"
                      style={{ color: isMe ? '#f97316' : '#e5e7eb' }}
                    >
                      {p.display_name?.trim() || p.username}
                      {isMe && <span className="text-[9px] text-orange-700 ml-1">YOU</span>}
                    </div>
                    <div className="text-[9px] text-gray-600">
                      {p.wins + p.losses} battles
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-green-400">
                      {p.wins}W
                      <span className="text-gray-600 mx-0.5">/</span>
                      <span className="text-red-500">{p.losses}L</span>
                    </div>
                    <div className="text-[9px] text-gray-600">
                      {winRate}% win
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nav */}
        <div className="mt-8 flex gap-3 justify-center text-[10px]">
          <Link href="/" className="text-gray-600 hover:text-gray-400">HOME</Link>
          <span className="text-gray-700">·</span>
          <Link href="/game" className="text-gray-600 hover:text-gray-400">SOLO PLAY</Link>
          {player && (
            <>
              <span className="text-gray-700">·</span>
              <Link href="/online" className="text-gray-600 hover:text-gray-400">ONLINE</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
