import { normalizeWord } from "./evaluateGuess"
import nytAdditionalGuesses from "./wordlists/nytAdditionalGuesses.json"
import nytAnswers from "./wordlists/nytAnswers.json"

export interface WordSource {
  chooseAnswer(): string
  allowedWords(): ReadonlySet<string>
}

const ANSWERS = nytAnswers.map(normalizeWord)
const ALL_WORDS = new Set(
  [...nytAnswers, ...nytAdditionalGuesses].map(normalizeWord),
)

function firstAnswer(): string {
  const answer = ANSWERS[0]
  if (answer === undefined) {
    throw new Error("The bundled answer list must contain at least one word")
  }
  return answer
}

const DEFAULT_ANSWER = firstAnswer()

export class BundledWordSource implements WordSource {
  private previousAnswer: string | undefined

  chooseAnswer(): string {
    const candidates = ANSWERS.filter((word) => word !== this.previousAnswer)
    const answer =
      candidates[Math.floor(Math.random() * candidates.length)] ?? DEFAULT_ANSWER
    this.previousAnswer = answer
    return answer
  }

  allowedWords(): ReadonlySet<string> {
    return ALL_WORDS
  }
}
