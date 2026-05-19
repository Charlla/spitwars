/*
 * <PixelStatPill> — HUD chip with a tiny label above a mono value.
 *
 *   <PixelStatPill label="SCORE" value={1240} />
 *   <PixelStatPill label="HP" value={`${hp}%`} tone="danger" />
 *
 * Tones change the value colour; the chip itself stays neutral so it reads
 * as part of the HUD chrome regardless.
 */

import type { ReactNode } from 'react'

export type PillTone = 'default' | 'accent' | 'accent-2' | 'success' | 'warning' | 'danger' | 'info'

const TONE_TEXT: Record<PillTone, string> = {
  'default':  'text-game-ink',
  'accent':   'text-game-accent',
  'accent-2': 'text-game-accent-2',
  'success':  'text-game-success',
  'warning':  'text-game-warning',
  'danger':   'text-game-danger',
  'info':     'text-game-info',
}

export interface PixelStatPillProps {
  label: string
  value: ReactNode
  tone?: PillTone
  /** Show subtle glow ring around the chip in the tone colour */
  glow?: boolean
  className?: string
}

export default function PixelStatPill({ label, value, tone = 'default', glow, className }: PixelStatPillProps) {
  return (
    <div
      className={[
        'inline-flex flex-col items-start gap-0 rounded-game-sm border border-game-border bg-game-surface/85 backdrop-blur-sm',
        'px-2.5 py-1.5 leading-none',
        glow ? 'shadow-game-glow-sm' : '',
        className ?? '',
      ].join(' ')}
    >
      <span
        className="font-mono uppercase text-game-ink-faint"
        style={{ fontSize: '8px', letterSpacing: '2px' }}
      >
        {label}
      </span>
      <span className={`font-mono font-bold ${TONE_TEXT[tone]}`} style={{ fontSize: '14px' }}>
        {value}
      </span>
    </div>
  )
}
