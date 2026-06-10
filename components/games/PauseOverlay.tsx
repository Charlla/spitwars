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
  /** Optional helper text rendered under the title (e.g. confirm copy) */
  message?: ReactNode
  onResume?: () => void
  resumeLabel?: string
  onRestart?: () => void
  onSettings?: () => void
  onQuit?: () => void
  quitLabel?: string
  /** Slot for additional buttons or content between Resume and Settings */
  extra?: ReactNode
}

export default function PauseOverlay({
  open,
  title = 'PAUSED',
  message,
  onResume,
  resumeLabel = 'Resume',
  onRestart,
  onSettings,
  onQuit,
  quitLabel = 'Quit',
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
        {message && (
          <p className="mb-1 text-center font-mono text-xs leading-relaxed text-game-ink-muted">
            {message}
          </p>
        )}
        {onResume && (
          <NeonButton variant="primary" size="md" fullWidth onClick={onResume}>{resumeLabel}</NeonButton>
        )}
        {extra}
        {onRestart && (
          <NeonButton variant="ghost" size="md" fullWidth onClick={onRestart}>Restart</NeonButton>
        )}
        {onSettings && (
          <NeonButton variant="ghost" size="md" fullWidth onClick={onSettings}>Settings</NeonButton>
        )}
        {onQuit && (
          <NeonButton variant="danger" size="md" fullWidth onClick={onQuit}>{quitLabel}</NeonButton>
        )}
      </div>
    </div>
  )
}
