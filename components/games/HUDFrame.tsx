/*
 * <HUDFrame> — wrapper for in-game HUD overlay.
 *
 * Absolute-positioned over the game canvas. Children at the top/bottom corners
 * are positioned via the helper components <HUDTopLeft>, <HUDTopRight>,
 * <HUDBottomCenter> etc. — these are just CSS slots.
 *
 * The frame itself has pointer-events: none so the canvas underneath still
 * receives all gestures. Each slot re-enables pointer-events for buttons.
 *
 *   <HUDFrame>
 *     <HUDTopLeft><PixelStatPill label="SCORE" value={score}/></HUDTopLeft>
 *     <HUDTopRight><PixelStatPill label="HP" value={hp}/></HUDTopRight>
 *     <HUDBottomCenter>…controls…</HUDBottomCenter>
 *   </HUDFrame>
 */

import type { ReactNode } from 'react'

export function HUDFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 select-none ${className ?? ''}`}
      style={{ touchAction: 'none' }}
    >
      {children}
    </div>
  )
}

const SLOT = 'absolute flex pointer-events-auto'

export function HUDTopLeft({ children }: { children: ReactNode }) {
  return <div className={`${SLOT} top-3 left-3 flex-col gap-1.5 items-start`}>{children}</div>
}
export function HUDTopRight({ children }: { children: ReactNode }) {
  return <div className={`${SLOT} top-3 right-3 flex-col gap-1.5 items-end`}>{children}</div>
}
export function HUDTopCenter({ children }: { children: ReactNode }) {
  return <div className={`${SLOT} top-3 left-1/2 -translate-x-1/2 flex-col gap-1.5 items-center`}>{children}</div>
}
export function HUDBottomLeft({ children }: { children: ReactNode }) {
  return <div className={`${SLOT} bottom-3 left-3 flex-col gap-1.5 items-start`}>{children}</div>
}
export function HUDBottomRight({ children }: { children: ReactNode }) {
  return <div className={`${SLOT} bottom-3 right-3 flex-col gap-1.5 items-end`}>{children}</div>
}
export function HUDBottomCenter({ children }: { children: ReactNode }) {
  return <div className={`${SLOT} bottom-3 left-1/2 -translate-x-1/2 flex-col gap-1.5 items-center`}>{children}</div>
}
