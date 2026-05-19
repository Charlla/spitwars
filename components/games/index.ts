/*
 * Barrel export — copy this folder into each game's components/games/ folder.
 */

export { default as ArcadeTitle, type ArcadeTitleProps } from './ArcadeTitle'
export { default as NeonButton, type NeonButtonProps, type NeonVariant, type NeonSize } from './NeonButton'
export { default as PixelStatPill, type PixelStatPillProps, type PillTone } from './PixelStatPill'
export { default as MeterBar, type MeterBarProps, type MeterTone } from './MeterBar'
export {
  HUDFrame,
  HUDTopLeft, HUDTopRight, HUDTopCenter,
  HUDBottomLeft, HUDBottomRight, HUDBottomCenter,
} from './HUDFrame'
export { default as PauseOverlay, type PauseOverlayProps } from './PauseOverlay'
export { default as GameOverScreen, type GameOverScreenProps, type GameOverStat } from './GameOverScreen'
export { default as ScoreTicker, useScoreTickerQueue, type TickerItem } from './ScoreTicker'
