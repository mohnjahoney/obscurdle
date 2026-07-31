import type Phaser from "phaser"
import type { LetterResult } from "../../core/evaluateGuess"

export const KEYBOARD_PRESENTATION_IDS = [
  "standard",
  "vintage-typewriter",
] as const

export type KeyboardPresentationId =
  (typeof KEYBOARD_PRESENTATION_IDS)[number]

export type KeyState = "empty" | LetterResult

export interface KeyCapPresentation {
  readonly objects: readonly Phaser.GameObjects.GameObject[]
  readonly hitTarget: Phaser.GameObjects.GameObject
  applyState(state: KeyState): void
  animatePress?(container: Phaser.GameObjects.Container): void
}
