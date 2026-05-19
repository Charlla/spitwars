/*
 * <MeterBar> — horizontal progress bar for HP, energy, tire, power, etc.
 *
 *   <MeterBar value={tire} max={100} tone="hp" label="TIRE" />
 *
 * Tones:
 *   hp       — green → yellow → red gradient based on value (default)
 *   accent   — solid accent
 *   accent-2 — solid accent-2
 *   energy   — accent → accent-2 gradient (linear)
 */

import type { ReactNode } from 'react'

export type MeterTone = 'hp' | 'accent' | 'accent-2' | 'energy'

export interface MeterBarProps {
  value: number
  max?: number
  tone?: MeterTone
  label?: string
  /** Show the numeric value beside the label (e.g. "TIRE  82%") */
  showValue?: boolean
  /** Suffix for showValue (default "%") */
  unit?: string
  className?: string
  /** height in px (default 10) */
  height?: number
  children?: ReactNode
}

function hpGradient(pct: number) {
  if (pct > 60) return 'linear-gradient(90deg, #22c55e, #4ade80)'
  if (pct > 30) return 'linear-gradient(90deg, #facc15, #f59e0b)'
  return 'linear-gradient(90deg, #ef4444, #dc2626)'
}

export default function MeterBar({
  value,
  max = 100,
  tone = 'hp',
  label,
  showValue,
  unit = '%',
  className,
  height = 10,
  children,
}: MeterBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  let fill: string
  switch (tone) {
    case 'hp':       fill = hpGradient(pct); break
    case 'accent':   fill = 'var(--game-accent)'; break
    case 'accent-2': fill = 'var(--game-accent-2)'; break
    case 'energy':   fill = 'linear-gradient(90deg, var(--game-accent), var(--game-accent-2))'; break
  }
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      {(label || showValue) && (
        <div className="flex justify-between font-mono uppercase text-game-ink-muted leading-none" style={{ fontSize: '9px', letterSpacing: '2px' }}>
          {label && <span>{label}</span>}
          {showValue && <span className="text-game-ink">{Math.round(value)}{unit}</span>}
        </div>
      )}
      <div
        className="relative w-full overflow-hidden rounded-game-pill border border-game-border bg-game-surface"
        style={{ height }}
      >
        <div
          className="h-full transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%`, background: fill }}
        />
        {children}
      </div>
    </div>
  )
}
