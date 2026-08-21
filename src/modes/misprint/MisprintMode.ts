import type { GuessTransformContext } from "../../core/Puzzle"
import type { MisprintModePresentationState } from "../../presentation/model/ModePresentationState"
import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import { MISPRINT_CONFIG } from "./misprintConfig"
import { selectMisprintWord } from "./selectMisprintWord"

export class MisprintMode implements ObscuringMode {
  private readonly legibleCells = new Set<string>()
  private readonly displayWords = new Map<number, string>()

  constructor(private readonly random: () => number = Math.random) {}

  start(): void {
    this.legibleCells.clear()
    this.displayWords.clear()
  }

  presentationState(): MisprintModePresentationState {
    return {
      kind: "misprint",
      displayWords: Array.from(this.displayWords, ([row, word]) => ({ row, word })),
      legibleCells: Array.from(this.legibleCells, (key) => {
        const [row, column] = key.split(":").map(Number)
        return { row: row!, column: column! }
      }),
    }
  }

  onGuessSubmitted(_context: ModeContext, row: number, displayWord?: string): void {
    if (displayWord) this.displayWords.set(row, displayWord)
  }

  transformSubmittedWord(context: GuessTransformContext): string {
    return selectMisprintWord({
      ...context,
      preferredDistance: MISPRINT_CONFIG.preferredDistance,
      maximumDistance: MISPRINT_CONFIG.maximumDistance,
      random: this.random,
    })
  }

  onLetterLegible(row: number, column: number): boolean {
    const key = `${row}:${column}`
    if (this.legibleCells.has(key)) return false
    this.legibleCells.add(key)
    return true
  }

  update(): boolean {
    return false
  }

  stop(): void {
    this.legibleCells.clear()
  }
}
