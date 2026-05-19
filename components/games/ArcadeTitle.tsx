/*
 * <ArcadeTitle> — Game wordmark for intro/menu screens.
 *
 * Two-line big-display gradient with optional watermark layer behind.
 * Pass two strings (e.g. "SPIN" + "MFANA") or one for a single-line wordmark.
 *
 *   <ArcadeTitle line1="SPIN" line2="MFANA" tagline="Donut till you drop"
 *                gradient="linear-gradient(180deg, #fcd00b 0%, #ff8a00 60%, #d92d2d 100%)"
 *                watermarkOpacity={0.10} />
 */

import type { CSSProperties } from 'react'

export interface ArcadeTitleProps {
  line1: string
  line2?: string
  tagline?: string
  /** Any valid CSS background value — defaults to amber→red */
  gradient?: string
  /** Show ghost watermark behind the title */
  watermark?: boolean
  /** 0..1 — default 0.10 */
  watermarkOpacity?: number
  /** rotate watermark (default -10deg) */
  watermarkRotation?: number
  className?: string
}

export default function ArcadeTitle({
  line1,
  line2,
  tagline,
  gradient = 'linear-gradient(180deg, var(--game-accent) 0%, var(--game-accent-2) 100%)',
  watermark = true,
  watermarkOpacity = 0.10,
  watermarkRotation = -10,
  className,
}: ArcadeTitleProps) {
  const heroStyle: CSSProperties = {
    fontFamily: 'var(--font-arcade)',
    background: gradient,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    letterSpacing: '-0.02em',
    lineHeight: 0.85,
  }
  return (
    <div className={`relative flex flex-col items-center text-center ${className ?? ''}`}>
      {watermark && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: `rotate(${watermarkRotation}deg)` }}
        >
          <div
            className="font-black leading-none"
            style={{
              fontFamily: 'var(--font-arcade)',
              fontSize: 'clamp(160px, 38vw, 520px)',
              color: `color-mix(in oklab, var(--game-accent) ${Math.round(watermarkOpacity * 100)}%, transparent)`,
              letterSpacing: '-0.04em',
            }}
          >
            {line1}
          </div>
          {line2 && (
            <div
              className="font-black leading-none -mt-[0.1em]"
              style={{
                fontFamily: 'var(--font-arcade)',
                fontSize: 'clamp(110px, 26vw, 360px)',
                color: `color-mix(in oklab, var(--game-accent-2) ${Math.round(watermarkOpacity * 100 + 2)}%, transparent)`,
                letterSpacing: '-0.03em',
              }}
            >
              {line2}
            </div>
          )}
        </div>
      )}
      <h1
        className="relative z-10 font-black"
        style={{ ...heroStyle, fontSize: 'clamp(54px, 14vw, 168px)' }}
      >
        {line1}
        {line2 && (
          <>
            <span style={{ display: 'block', marginTop: '-0.05em' }}>{line2}</span>
          </>
        )}
      </h1>
      {tagline && (
        <p
          className="relative z-10 mt-3 font-mono uppercase max-w-md"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--game-ink-muted)',
            fontSize: 'clamp(10px, 2.6vw, 12px)',
            letterSpacing: '3px',
          }}
        >
          {tagline}
        </p>
      )}
    </div>
  )
}
