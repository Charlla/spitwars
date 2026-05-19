'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle2 } from 'lucide-react'

type Shape = 'circle' | 'square' | 'diamond'
const ALL: Shape[] = ['circle', 'square', 'diamond']
const LABEL: Record<Shape, string> = { circle: 'circle', square: 'square', diamond: 'diamond' }

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

function newChallenge() {
  return {
    shapes: shuffle(ALL),
    target: ALL[Math.floor(Math.random() * ALL.length)],
  }
}

function ShapeIcon({ shape, lit }: { shape: Shape; lit: boolean }) {
  const glow = lit ? 'border-primary bg-primary/10 scale-110 shadow-sm' : 'border-border'
  if (shape === 'circle') {
    return (
      <div
        data-shape={shape}
        className={`h-11 w-11 rounded-full border-2 transition-all duration-100 ${glow}`}
      />
    )
  }
  if (shape === 'square') {
    return (
      <div
        data-shape={shape}
        className={`h-11 w-11 rounded-sm border-2 transition-all duration-100 ${glow}`}
      />
    )
  }
  return (
    <div data-shape={shape} className="flex h-11 w-11 items-center justify-center">
      <div
        data-shape={shape}
        className={`h-7 w-7 rotate-45 border-2 transition-all duration-100 ${glow}`}
      />
    </div>
  )
}

export function HumanVerify({ onVerified }: { onVerified: () => void }) {
  const [ch, setCh] = useState(newChallenge)
  const [done, setDone] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [lit, setLit] = useState<Shape | null>(null)
  const [dragging, setDragging] = useState(false)

  const dragRef = useRef(false)
  const startRef = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const posRef = useRef({ x: 0, y: 0 })
  const targetRef = useRef(ch.target)
  targetRef.current = ch.target

  const reset = useCallback(() => {
    const c = newChallenge()
    setCh(c)
    setDone(false)
    setWrong(false)
    setPos({ x: 0, y: 0 })
    posRef.current = { x: 0, y: 0 }
    setLit(null)
    setDragging(false)
    dragRef.current = false
  }, [])

  useEffect(() => {
    if (!wrong) return
    const t = setTimeout(reset, 700)
    return () => clearTimeout(t)
  }, [wrong, reset])

  useEffect(() => {
    function coords(e: MouseEvent | TouchEvent) {
      return 'touches' in e
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
    }
    function endCoords(e: MouseEvent | TouchEvent) {
      return 'changedTouches' in e
        ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
        : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
    }

    function onMove(e: MouseEvent | TouchEvent) {
      if (!dragRef.current) return
      const { x, y } = coords(e)
      const np = {
        x: startRef.current.px + x - startRef.current.mx,
        y: startRef.current.py + y - startRef.current.my,
      }
      posRef.current = np
      setPos({ ...np })
      const el = document.elementFromPoint(x, y)
      setLit((el?.closest('[data-shape]')?.getAttribute('data-shape') as Shape) ?? null)
    }

    function onUp(e: MouseEvent | TouchEvent) {
      if (!dragRef.current) return
      dragRef.current = false
      setDragging(false)
      const { x, y } = endCoords(e)
      const el = document.elementFromPoint(x, y)
      const dropped = el?.closest('[data-shape]')?.getAttribute('data-shape') as Shape | null
      setLit(null)
      if (!dropped) {
        setPos({ x: 0, y: 0 }); posRef.current = { x: 0, y: 0 }; return
      }
      if (dropped === targetRef.current) {
        setDone(true)
        setTimeout(onVerified, 400)
      } else {
        setWrong(true)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [onVerified])

  function onDotStart(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (done) return
    dragRef.current = true
    setDragging(true)
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : (e as React.MouseEvent)
    startRef.current = { mx: clientX, my: clientY, px: posRef.current.x, py: posRef.current.y }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
        <CheckCircle2 className="size-4 shrink-0" /> Human confirmed
      </div>
    )
  }

  return (
    <div className={`select-none rounded-lg border px-4 py-3 transition-colors ${wrong ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-muted/20'}`}>
      <p className="mb-0.5 text-xs text-muted-foreground">Quick check</p>
      <p className="mb-4 text-sm">
        Drag the{' '}
        <span className="inline-block h-3.5 w-3.5 rounded-full bg-red-500 align-middle" />{' '}
        to the <strong>{LABEL[ch.target]}</strong>
      </p>
      <div className="flex items-center gap-3">
        {/* Draggable dot */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <div
            onMouseDown={onDotStart}
            onTouchStart={onDotStart}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px)`,
              cursor: dragging ? 'grabbing' : 'grab',
              pointerEvents: dragging ? 'none' : 'auto',
              touchAction: 'none',
            }}
            className="absolute h-9 w-9 rounded-full bg-red-500 shadow-md transition-shadow hover:shadow-lg"
          />
        </div>
        <span className="shrink-0 text-muted-foreground/40">→</span>
        <div className="flex gap-3">
          {ch.shapes.map((s) => (
            <ShapeIcon key={s} shape={s} lit={lit === s} />
          ))}
        </div>
      </div>
      {wrong && (
        <p className="mt-2 text-xs text-destructive">
          That&apos;s the {lit || 'wrong shape'} — try again
        </p>
      )}
    </div>
  )
}
