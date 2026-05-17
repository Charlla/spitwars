import Link from 'next/link';
import { getSessionPlayer } from '@/lib/auth';

// Full llama SVG — matches the original v0 menu hero
function LlamaSvg({ flip, color, delay }: { flip?: boolean; color: string; delay: number }) {
  return (
    <svg
      viewBox="0 0 100 80"
      className="w-20 h-16"
      style={{ transform: flip ? 'scaleX(-1)' : 'none' }}
    >
      <ellipse cx="50" cy="55" rx="22" ry="18" fill={color} />
      <rect x="32" y="62" width="5" height="16" rx="2" fill={color} opacity="0.8" />
      <rect x="42" y="62" width="5" height="16" rx="2" fill={color} opacity="0.8" />
      <rect x="54" y="62" width="5" height="16" rx="2" fill={color} opacity="0.8" />
      <rect x="64" y="62" width="5" height="16" rx="2" fill={color} opacity="0.8" />
      <rect x="60" y="25" width="10" height="35" rx="4" fill={color} />
      <ellipse cx="68" cy="20" rx="12" ry="10" fill={color} />
      <ellipse cx="60" cy="10" rx="3" ry="6" fill={color} />
      <ellipse cx="76" cy="10" rx="3" ry="6" fill={color} />
      <circle cx="72" cy="18" r="2" fill="#1a1a2e" />
      <ellipse cx="78" cy="22" rx="5" ry="4" fill={color} opacity="0.7" />
      <g style={{ animation: `pulse 1.6s ${delay}ms infinite` }}>
        <circle cx="88" cy="20" r="2.5" fill="#60a5fa" opacity="0.9" />
        <circle cx="94" cy="18" r="2" fill="#60a5fa" opacity="0.7" />
        <circle cx="98" cy="22" r="1.5" fill="#60a5fa" opacity="0.5" />
      </g>
    </svg>
  );
}

export default async function Home() {
  const player = await getSessionPlayer();

  return (
    <div className="min-h-screen bg-[#060614] text-white font-mono flex flex-col items-center justify-center p-4">
      {/* Hero — title flanked by two llamas, just like the original menu */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <LlamaSvg color="#f59e0b" delay={0} />
        <div className="flex flex-col items-center">
          <div className="text-4xl sm:text-5xl font-bold tracking-widest bg-gradient-to-r from-orange-500 via-yellow-400 to-cyan-500 bg-clip-text text-transparent">
            SPITWARS
          </div>
          <div className="text-[10px] text-gray-600 tracking-widest mt-1">SPIT HAPPENS.</div>
          <div className="text-[8px] text-cyan-600 tracking-wider mt-0.5 border border-cyan-800 rounded px-1.5 py-0.5">
            EARLY ALPHA
          </div>
        </div>
        <LlamaSvg color="#06b6d4" flip delay={200} />
      </div>

      {/* Main buttons */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <Link
          href="/game"
          className="w-full py-4 font-bold tracking-widest rounded-xl text-white text-center block"
          style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}
        >
          PLAY
        </Link>

        <Link
          href="/online"
          className="w-full py-3 font-bold tracking-widest rounded-xl text-center block border"
          style={{
            borderColor: '#06b6d4',
            color: '#06b6d4',
            background: 'rgba(6,182,212,.08)',
          }}
        >
          PLAY ONLINE
        </Link>

        <Link
          href="/leaderboard"
          className="w-full py-3 font-bold tracking-widest rounded-xl text-center block border border-gray-700 text-gray-400"
        >
          LEADERBOARD
        </Link>
      </div>

      {/* Player info */}
      {player ? (
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
      ) : (
        <div className="mt-6 text-center">
          <Link href="/auth" className="text-[11px] text-gray-500 hover:text-gray-400 underline">
            Sign in to save your stats →
          </Link>
        </div>
      )}

      <div className="mt-8 text-[9px] text-gray-800">spitwars.com</div>
    </div>
  );
}
