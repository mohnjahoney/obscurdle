import type Phaser from "phaser"
import type { GuessTransformContext } from "../core/Puzzle"
import type { BoardView } from "../presentation/BoardView"
import type { BoardPresentationId } from "../presentation/board/BoardPresentation"
import type { KeyboardPresentationId } from "../presentation/keyboard/KeyboardPresentation"

export const MODE_IDS = [
  "plain",
  "fading-ink",
  "flashlight",
  "candlelight",
  "sneaking-tiles",
  "magnifying-glass",
  "misprint",
  "vintage-typewriter",
] as const

export type ModeId = (typeof MODE_IDS)[number]

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
  boardPresentation?: BoardPresentationId
  keyboardPresentation?: KeyboardPresentationId
  create(): ObscuringMode
}
