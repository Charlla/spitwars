/*
 * <GameOverScreen> — full-screen end-of-round overlay.
 *
 *   <GameOverScreen
 *     title="GAME OVER"
 *     subtitle="Tires Popped"
 *     stats={[{ label: 'Score', value: 1480 }, { label: 'Combo', value: '24°' }]}
 *     onReplay={restart}
 *     onSubmit={submit}
 *     onQuit={quit}
 *   />
 */

import type { ReactNode } from 'react'
import NeonButton from './NeonButton'

export interface GameOverStat {
  label: string
  value: ReactNode
  tone?: 'default' | 'accent' | 'accent-2' | 'success' | 'danger'
}

export interface GameOverScreenProps {
  open?: boolean
  title?: string
  subtitle?: string
  stats?: GameOverStat[]
  onReplay?: () => void
  replayLabel?: string
  onSubmit?: () => void
  submitLabel?: string
  submitting?: boolean
  onQuit?: () => void
  quitLabel?: string
  extra?: ReactNode
}

const STAT_TONE: Record<NonNullable<GameOverStat['tone']>, string> = {
  default:   'text-game-ink',
  accent:    'text-game-accent',
  'accent-2':'text-game-accent-2',
  success:   'text-game-success',
  danger:    'text-game-danger',
}

export default function GameOverScreen({
  open = true,
  title = 'GAME OVER',
  subtitle,
  stats = [],
  onReplay,
  replayLabel = 'Play Again',
  onSubmit,
  submitLabel = 'Submit Score',
  submitting,
  onQuit,
  quitLabel = 'Quit',
  extra,
}: GameOverScreenProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-game-deep/85 backdrop-blur-md">
      <div className="flex w-[min(92vw,420px)] flex-col items-center gap-5 rounded-game-lg border border-game-border-strong bg-game-surface/90 p-6 shadow-game-glow-md">
        <h2
          className="text-center font-arcade font-black uppercase text-game-ink"
          style={{ fontFamily: 'var(--font-arcade)', fontSize: '48px', letterSpacing: '4px', lineHeight: 0.9 }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="font-mono uppercase text-game-ink-muted text-center" style={{ fontSize: '11px', letterSpacing: '3px' }}>
            {subtitle}
          </p>
        )}
        {stats.length > 0 && (
          <div className="grid w-full grid-cols-2 gap-3">
            {stats.map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1 rounded-game-md border border-game-border bg-game-bg/60 px-3 py-3"
              >
                <span className="font-mono uppercase text-game-ink-faint" style={{ fontSize: '9px', letterSpacing: '2px' }}>
                  {s.label}
                </span>
                <span className={`font-mono font-bold ${STAT_TONE[s.tone ?? 'default']}`} style={{ fontSize: '24px' }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        )}
        {extra}
        <div className="flex w-full flex-col gap-2">
          {onReplay && <NeonButton variant="primary" size="md" fullWidth onClick={onReplay}>{replayLabel}</NeonButton>}
          {onSubmit && (
            <NeonButton variant="secondary" size="md" fullWidth onClick={onSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : submitLabel}
            </NeonButton>
          )}
          {onQuit && <NeonButton variant="ghost" size="md" fullWidth onClick={onQuit}>{quitLabel}</NeonButton>}
        </div>
      </div>
    </div>
  )
}
