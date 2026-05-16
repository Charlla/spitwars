import Link from 'next/link';
import { getSessionPlayer } from '@/lib/auth';

export default async function Home() {
  const player = await getSessionPlayer();

  return (
    <div className="min-h-screen bg-[#060614] text-white font-mono flex flex-col items-center justify-center p-4">
      {/* Hero */}
      <div className="flex flex-col items-center gap-1 mb-8">
        <div className="text-5xl font-bold tracking-widest bg-gradient-to-r from-orange-500 via-yellow-400 to-cyan-500 bg-clip-text text-transparent">
          SPITWARS
        </div>
        <div className="text-[11px] text-gray-600 tracking-widest">SPIT HAPPENS.</div>
        <div className="text-[9px] text-cyan-700 tracking-wider border border-cyan-900 rounded px-1.5 py-0.5 mt-1">
          EARLY ALPHA
        </div>
      </div>

      {/* Llamas SVG decoration */}
      <div className="flex gap-4 mb-8 opacity-60">
        <svg viewBox="0 0 100 80" className="w-16 h-12">
          <ellipse cx="50" cy="55" rx="22" ry="18" fill="#f97316" />
          <ellipse cx="68" cy="20" rx="12" ry="10" fill="#f97316" />
          <ellipse cx="60" cy="10" rx="3" ry="6" fill="#f97316" />
          <ellipse cx="76" cy="10" rx="3" ry="6" fill="#f97316" />
          <circle cx="72" cy="18" r="2" fill="#1a1a2e" />
        </svg>
        <div className="text-2xl self-center">💦</div>
        <svg viewBox="0 0 100 80" className="w-16 h-12" style={{ transform: 'scaleX(-1)' }}>
          <ellipse cx="50" cy="55" rx="22" ry="18" fill="#06b6d4" />
          <ellipse cx="68" cy="20" rx="12" ry="10" fill="#06b6d4" />
          <ellipse cx="60" cy="10" rx="3" ry="6" fill="#06b6d4" />
          <ellipse cx="76" cy="10" rx="3" ry="6" fill="#06b6d4" />
          <circle cx="72" cy="18" r="2" fill="#1a1a2e" />
        </svg>
      </div>

      {/* Main buttons */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <Link
          href="/game"
          className="w-full py-4 font-bold tracking-widest rounded-xl text-white text-center block"
          style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}
        >
          PLAY SOLO
        </Link>

        {player ? (
          <Link
            href="/online"
            className="w-full py-4 font-bold tracking-widest rounded-xl text-center block"
            style={{
              background: 'linear-gradient(135deg,#06b6d4,#0891b2)',
              color: 'white',
            }}
          >
            PLAY ONLINE
          </Link>
        ) : (
          <Link
            href="/auth"
            className="w-full py-4 font-bold tracking-widest rounded-xl text-center block border"
            style={{
              borderColor: '#06b6d4',
              color: '#06b6d4',
              background: 'rgba(6,182,212,.08)',
            }}
          >
            PLAY ONLINE →
          </Link>
        )}

        <Link
          href="/leaderboard"
          className="w-full py-3 font-bold tracking-widest rounded-xl text-center block border border-gray-700 text-gray-400"
        >
          LEADERBOARD
        </Link>
      </div>

      {/* Player info */}
      {player && (
        <div className="mt-6 text-center">
          <div className="text-[11px] text-gray-500">
            Logged in as{' '}
            <span className="text-orange-400 font-bold">{player.username}</span>
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">
            W{player.wins} / L{player.losses}
          </div>
          <form action="/api/auth/logout" method="post" className="inline">
            <button type="submit" className="text-[10px] text-gray-700 hover:text-gray-500 mt-1 underline">
              logout
            </button>
          </form>
        </div>
      )}

      {!player && (
        <div className="mt-4 text-[10px] text-gray-700">
          <Link href="/auth" className="hover:text-gray-500">
            Sign in for online play + leaderboard
          </Link>
        </div>
      )}

      <div className="mt-8 text-[9px] text-gray-800">spitwars.com</div>
    </div>
  );
}
