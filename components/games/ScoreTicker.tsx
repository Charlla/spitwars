/*
 * <ScoreTicker> — floating "+N" / combo popups that rise + fade.
 *
 * Stateless: it just shows whatever pops you put in `items`. Game logic owns
 * the lifecycle (push on score events, expire after ~1.2s).
 *
 *   <ScoreTicker items={[{ id: 1, text: '+50', tone: 'accent' }]} />
 *
 * Use `useScoreTickerQueue()` below if you want a ready-to-go FIFO with
 * auto-expiry.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface TickerItem {
  id: number | string
  text: string
  tone?: 'accent' | 'accent-2' | 'success' | 'danger' | 'default'
}

const TONE: Record<NonNullable<TickerItem['tone']>, string> = {
  default:   'text-game-ink',
  accent:    'text-game-accent',
  'accent-2':'text-game-accent-2',
  success:   'text-game-success',
  danger:    'text-game-danger',
}

export default function ScoreTicker({ items }: { items: TickerItem[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {items.map(item => (
        <span
          key={item.id}
          className={`absolute left-1/2 top-1/3 -translate-x-1/2 font-mono font-black uppercase ${TONE[item.tone ?? 'accent']} animate-[scoreFloat_1.2s_ease-out_forwards]`}
          style={{
            fontSize: 'clamp(28px, 6vw, 48px)',
            letterSpacing: '2px',
            textShadow: '0 0 12px currentColor',
          }}
        >
          {item.text}
        </span>
      ))}
      {/* keyframes injected once via global CSS in the host app:
          @keyframes scoreFloat {
            0%   { transform: translate(-50%, 0)    scale(0.7); opacity: 0; }
            20%  { transform: translate(-50%, -10px) scale(1.1); opacity: 1; }
            100% { transform: translate(-50%, -80px) scale(1.0); opacity: 0; }
          }
      */}
    </div>
  )
}

let _id = 0

export function useScoreTickerQueue(ttlMs = 1200) {
  const [items, setItems] = useState<TickerItem[]>([])
  const timeouts = useRef<Map<number | string, ReturnType<typeof setTimeout>>>(new Map())

  const push = useCallback((text: string, tone: TickerItem['tone'] = 'accent') => {
    const id = ++_id
    setItems(prev => [...prev, { id, text, tone }])
    const handle = setTimeout(() => {
      setItems(prev => prev.filter(p => p.id !== id))
      timeouts.current.delete(id)
    }, ttlMs)
    timeouts.current.set(id, handle)
  }, [ttlMs])

  useEffect(() => () => {
    timeouts.current.forEach(clearTimeout)
    timeouts.current.clear()
  }, [])

  return { items, push }
}
