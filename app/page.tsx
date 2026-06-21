import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getSessionPlayer } from '@/lib/auth';
import { JsonLd } from '@/components/json-ld';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Spit Wars — Turn-Based Artillery Llamas',
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
};

// Q&A used both on-page (extractable prose) and as FAQPage structured data.
const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is Spit Wars?',
    a: 'Spit Wars is a free, turn-based artillery game where rival teams of llamas and alpacas lob spit bombs, mortars, missiles and air strikes across destructible terrain. Wind and angle decide who eats grass.',
  },
  {
    q: 'Is Spit Wars free to play?',
    a: 'Yes. Spit Wars runs in your browser for free — no download required. Play solo against AI, pass-and-play locally, or battle a friend online.',
  },
  {
    q: 'Can I play Spit Wars online with friends?',
    a: 'Yes. Sign in with your email, create a room, and share the 6-character room code with a friend to play a live online match.',
  },
  {
    q: 'What weapons are in Spit Wars?',
    a: 'Five weapons: the Spit Bomb (bounces), the Mortar (high arc), the Missile (fast and wind-stable), the Air Strike (mark a target) and the Cluster (splits three ways).',
  },
];

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
      {/* Structured data: the game itself + the on-page FAQ. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'VideoGame',
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
          image: `${SITE_URL}/og.png`,
          inLanguage: 'en',
          applicationCategory: 'Game',
          genre: ['Artillery', 'Turn-based strategy', 'Casual'],
          gamePlatform: ['Web browser', 'Mobile web'],
          operatingSystem: 'Any (web browser)',
          playMode: ['SinglePlayer', 'MultiPlayer'],
          publisher: { '@id': `${SITE_URL}/#organization` },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />

      {/* Accessible / crawlable page title (the visual title is the hero art). */}
      <h1 className="sr-only">Spit Wars — turn-based artillery llamas</h1>

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

        {/* SSR factual content — readable by crawlers and LLMs without JS. */}
        <section className="w-full max-w-md mt-2 mb-10 text-left">
          <h2 className="text-sm font-mono font-bold tracking-[3px] uppercase text-game-accent">
            About Spit Wars
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-game-ink-muted">
            Spit Wars is a free, turn-based artillery game. Two teams — the
            Llamas and the Alpacas — take turns aiming spit bombs, mortars,
            missiles, cluster shots and air strikes across destructible terrain.
            Account for wind and angle, line up the perfect shot, and reduce the
            other herd to grass-eating regret. Play solo against AI, pass-and-play
            on one device, or battle a friend online with a shared room code.
          </p>

          <h2 className="mt-6 text-sm font-mono font-bold tracking-[3px] uppercase text-game-accent">
            FAQ
          </h2>
          <dl className="mt-2 space-y-3">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="text-xs font-bold text-game-ink">{f.q}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-game-ink-muted">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
