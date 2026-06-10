import Link from 'next/link';
import Image from 'next/image';
import { getSessionPlayer } from '@/lib/auth';

// Button styles mirror NeonButton (games/NeonButton.tsx) — kept inline here
// because we need Link semantics, not a <button>.
const neonBase =
  'inline-flex items-center justify-center gap-2 rounded-game-pill font-mono font-black uppercase ' +
  'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-accent/60 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none w-full';
const neonPrimary =
  'h-14 px-10 text-base tracking-[4px] text-game-deep shadow-game-glow-md hover:shadow-game-glow-lg ' +
  'bg-[linear-gradient(180deg,var(--game-accent)_0%,color-mix(in_oklab,var(--game-accent)_70%,var(--game-accent-2))_100%)]';
const neonSecondary =
  'h-12 px-6 text-sm tracking-[4px] text-game-ink ' +
  'bg-[linear-gradient(180deg,var(--game-accent-2)_0%,color-mix(in_oklab,var(--game-accent-2)_70%,#000)_100%)] ' +
  'shadow-[0_0_30px_color-mix(in_oklab,var(--game-accent-2)_45%,transparent)]';
const neonGhost =
  'h-12 px-6 text-sm tracking-[4px] text-game-ink bg-transparent border border-game-border-strong hover:bg-game-surface hover:border-game-accent/60';

export default async function Home() {
  const player = await getSessionPlayer();

  return (
    <div className="relative min-h-svh flex flex-col items-center overflow-hidden bg-game-deep text-game-ink p-4">
      {/* Hero — AI-generated title art */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-center"
      >
        <div
          className="relative w-[min(94vw,520px)] aspect-square mt-[2vh] opacity-95"
          style={{
            maskImage: 'radial-gradient(circle at center, black 55%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 55%, transparent 78%)',
          }}
        >
          <Image
            src="/title-hero.png"
            alt="Spitwars"
            fill
            sizes="(max-width: 520px) 94vw, 520px"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Foreground content positioned below the hero */}
      <div className="relative z-10 flex flex-col items-center mt-[44vh] sm:mt-[46vh]">
        <div className="text-[10px] tracking-[6px] font-mono text-game-ink-faint uppercase mb-4">
          early alpha · spit happens
        </div>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <Link href="/game"        className={`${neonBase} ${neonPrimary}`}>PLAY</Link>
          <Link href="/online"      className={`${neonBase} ${neonSecondary}`}>PLAY ONLINE</Link>
          <Link href="/leaderboard" className={`${neonBase} ${neonGhost}`}>LEADERBOARD</Link>
        </div>

        {player ? (
          <div className="mt-6 text-center">
            <div className="text-[11px] text-game-ink-muted">
              Logged in as <span className="text-game-accent font-bold">{player.display_name?.trim() || player.username}</span>
            </div>
            <div className="text-[10px] text-game-ink-faint mt-0.5">
              W{player.wins} / L{player.losses}
            </div>
            <form action="/api/auth/logout" method="post" className="inline">
              <button type="submit" className="text-[10px] text-game-ink-faint hover:text-game-ink-muted mt-1 underline">
                logout
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link href="/auth" className="text-[11px] text-game-ink-muted hover:text-game-ink underline">
              Sign in to save your stats →
            </Link>
          </div>
        )}

        <div className="mt-8 mb-4 text-[9px] text-game-ink-faint">spitwars.com</div>
      </div>
    </div>
  );
}
