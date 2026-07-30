import { normalizeWord } from "./evaluateGuess"

export interface WordSource {
  chooseAnswer(): string
  allowedWords(): ReadonlySet<string>
}

const ANSWERS = [
  "ALERT",
  "APPLE",
  "BEACH",
  "BLEND",
  "BLOOM",
  "BRAVE",
  "CHAIR",
  "CHARM",
  "CLOUD",
  "CRANE",
  "DREAM",
  "EARTH",
  "FIELD",
  "FLAME",
  "FLOUR",
  "FRAME",
  "FRESH",
  "GRAIN",
  "GRAPE",
  "GREEN",
  "HONEY",
  "HOUSE",
  "JUICE",
  "LEMON",
  "LIGHT",
  "MAGIC",
  "MAPLE",
  "MELON",
  "METAL",
  "MUSIC",
  "OCEAN",
  "PAINT",
  "PAPER",
  "PIANO",
  "PLANT",
  "PLATE",
  "POINT",
  "RADIO",
  "RIVER",
  "SCALE",
  "SHARE",
  "SHORE",
  "SLATE",
  "SMILE",
  "SPARK",
  "SPICE",
  "STAGE",
  "STONE",
  "STORM",
  "TABLE",
  "TASTE",
  "TIGER",
  "TOAST",
  "TRAIN",
  "WATER",
  "WHALE",
  "WHITE",
  "WORLD",
] as const

const EXTRA_GUESSES = [
  "ADIEU",
  "AROSE",
  "AUDIO",
  "CARES",
  "CIGAR",
  "IRATE",
  "LEAST",
  "RAISE",
  "RATES",
  "REACT",
  "ROAST",
  "STARE",
  "TEARS",
  "TRACE",
] as const

const ALL_WORDS = new Set([...ANSWERS, ...EXTRA_GUESSES].map(normalizeWord))

export class BundledWordSource implements WordSource {
  private previousAnswer: string | undefined

  chooseAnswer(): string {
    const candidates = ANSWERS.filter((word) => word !== this.previousAnswer)
    const answer = candidates[Math.floor(Math.random() * candidates.length)] ?? ANSWERS[0]
    this.previousAnswer = answer
    return answer
  }

  allowedWords(): ReadonlySet<string> {
    return ALL_WORDS
  }
}
