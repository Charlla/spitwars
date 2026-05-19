/*
 * <NeonButton> — Glowing arcade CTA.
 *
 *   <NeonButton variant="primary" size="lg" onClick={start}>Tap to Start</NeonButton>
 *
 * Variants:
 *   primary    — accent gradient + glow (default)
 *   secondary  — accent-2 gradient + glow
 *   ghost      — outline only, glow on hover
 *   danger     — red gradient + glow (quit/retry)
 *
 * Sizes: sm (h-9), md (h-12), lg (h-14)
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type NeonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type NeonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<NeonVariant, string> = {
  primary:
    'text-game-deep bg-[linear-gradient(180deg,var(--game-accent)_0%,color-mix(in_oklab,var(--game-accent)_70%,var(--game-accent-2))_100%)] shadow-game-glow-md hover:shadow-game-glow-lg',
  secondary:
    'text-game-ink bg-[linear-gradient(180deg,var(--game-accent-2)_0%,color-mix(in_oklab,var(--game-accent-2)_70%,#000)_100%)] shadow-[0_0_30px_color-mix(in_oklab,var(--game-accent-2)_45%,transparent)]',
  ghost:
    'text-game-ink bg-transparent border border-game-border-strong hover:bg-game-surface hover:border-game-accent/60',
  danger:
    'text-white bg-[linear-gradient(180deg,var(--game-danger)_0%,#900_100%)] shadow-game-glow-danger',
}

const SIZES: Record<NeonSize, string> = {
  sm: 'h-9  px-4  text-xs   tracking-[3px]',
  md: 'h-12 px-6  text-sm   tracking-[4px]',
  lg: 'h-14 px-10 text-base tracking-[4px]',
}

export interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeonVariant
  size?: NeonSize
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(function NeonButton(
  { variant = 'primary', size = 'md', fullWidth, leftIcon, rightIcon, children, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-game-pill font-mono font-black uppercase',
        'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-accent/60',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {leftIcon}
      <span className="relative z-10">{children}</span>
      {rightIcon}
    </button>
  )
})

export default NeonButton
