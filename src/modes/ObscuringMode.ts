import type Phaser from "phaser"
import type { GuessTransformContext } from "../core/Puzzle"
import type { ModePresentationState } from "../presentation/model/ModePresentationState"
import type { LetterBasePlacement } from "../presentation/board/boardLayout"
import type { BoardPresentationId } from "../presentation/board/BoardPresentation"

export const MODE_IDS = [
  "plain",
  "fading-ink",
  "flashlight",
  "candlelight",
  "sneaking-tiles",
  "magnifying-glass",
  "misprint",
] as const

export type ModeId = (typeof MODE_IDS)[number]

export interface ModeContext {
  scene: Phaser.Scene
  boardPresentation(): BoardPresentationId
  letterBasePlacementAt(row: number, column: number): LetterBasePlacement
}

export interface ObscuringMode {
  presentationState(): ModePresentationState
  start(context: ModeContext): void
  transformSubmittedWord?(context: GuessTransformContext): string
  onGuessSubmitted?(context: ModeContext, row: number, displayWord?: string): void
  onLetterLegible?(row: number, column: number): boolean | void
  onSceneEffectControlChange?(name: string, value: number): boolean | void
  update(context: ModeContext, deltaMs: number): boolean
  stop(context: ModeContext): void
}

export interface ModeDefinition {
  id: ModeId
  menuLabel: string
  mastheadLabel: string
  create(): ObscuringMode
}
