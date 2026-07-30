import type Phaser from "phaser"
import type { GuessTransformContext } from "../core/Puzzle"
import type { BoardView } from "../presentation/BoardView"

export type ModeId =
  | "plain"
  | "fading-ink"
  | "flashlight"
  | "candlelight"
  | "sneaking-tiles"
  | "magnifying-glass"
  | "misprint"

export type KeyboardRevealTiming = "immediate" | "letter-legible"

export interface ModeContext {
  scene: Phaser.Scene
  board: BoardView
}

export interface ObscuringMode {
  readonly keyboardRevealTiming?: KeyboardRevealTiming
  readonly letterLegibleProgress?: number
  start(context: ModeContext): void
  transformSubmittedWord?(context: GuessTransformContext): string
  onGuessSubmitted(context: ModeContext, row: number): void
  update(context: ModeContext, deltaMs: number): void
  stop(context: ModeContext): void
}

export interface ModeDefinition {
  id: ModeId
  menuLabel: string
  mastheadLabel: string
  footerLabel: string
  create(): ObscuringMode
}
