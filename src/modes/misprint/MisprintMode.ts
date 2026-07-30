import type { GuessTransformContext } from "../../core/Puzzle"
import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import { MISPRINT_CONFIG } from "./misprintConfig"
import { selectMisprintWord } from "./selectMisprintWord"

export class MisprintMode implements ObscuringMode {
  readonly keyboardRevealTiming = "letter-legible" as const
  readonly letterLegibleProgress = MISPRINT_CONFIG.letterLegibleProgress

  constructor(private readonly random: () => number = Math.random) {}

  start(): void {}

  transformSubmittedWord(context: GuessTransformContext): string {
    return selectMisprintWord({
      ...context,
      preferredDistance: MISPRINT_CONFIG.preferredDistance,
      maximumDistance: MISPRINT_CONFIG.maximumDistance,
      random: this.random,
    })
  }

  onGuessSubmitted(_context: ModeContext, _row: number): void {}

  update(): void {}

  stop(): void {}
}
