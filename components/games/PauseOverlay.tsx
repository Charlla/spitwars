/*
 * <PauseOverlay> — dim-screen modal with menu options.
 *
 *   <PauseOverlay
 *     open={paused}
 *     title="PAUSED"
 *     onResume={() => setPaused(false)}
 *     onRestart={restart}
 *     onQuit={() => router.push('/')}
 *   />
 *
 * If `open` is false the overlay returns null. ESC key is wired to onResume.
 */

'use client'

import { useEffect, type ReactNode } from 'react'
import NeonButton from './NeonButton'

export interface PauseOverlayProps {
  open: boolean
  title?: string
  onResume?: () => void
  onRestart?: () => void
  onSettings?: () => void
  onQuit?: () => void
  /** Slot for additional buttons or content between Resume and Settings */
  extra?: ReactNode
}

export default function PauseOverlay({
  open,
  title = 'PAUSED',
  onResume,
  onRestart,
  onSettings,
  onQuit,
  extra,
}: PauseOverlayProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && onResume) onResume()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onResume])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-game-deep/75 backdrop-blur-sm"
    >
      <div className="relative flex w-[min(92vw,360px)] flex-col items-stretch gap-3 rounded-game-lg border border-game-border-strong bg-game-surface p-6 shadow-game-glow-md">
        <h2
          className="mb-2 text-center font-arcade font-black uppercase text-game-ink"
          style={{ fontFamily: 'var(--font-arcade)', fontSize: '42px', letterSpacing: '4px' }}
        >
          {title}
        </h2>
        {onResume && (
          <NeonButton variant="primary" size="md" fullWidth onClick={onResume}>Resume</NeonButton>
        )}
        {extra}
        {onRestart && (
          <NeonButton variant="ghost" size="md" fullWidth onClick={onRestart}>Restart</NeonButton>
        )}
        {onSettings && (
          <NeonButton variant="ghost" size="md" fullWidth onClick={onSettings}>Settings</NeonButton>
        )}
        {onQuit && (
          <NeonButton variant="danger" size="md" fullWidth onClick={onQuit}>Quit</NeonButton>
        )}
      </div>
    </div>
  )
}
