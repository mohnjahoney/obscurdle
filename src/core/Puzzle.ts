import {
  evaluateGuess,
  normalizeWord,
  type LetterResult,
  WORD_LENGTH,
} from "./evaluateGuess"

export const MAX_GUESSES = 6

export type PuzzleStatus = "playing" | "won" | "lost"

export interface SubmittedGuess {
  word: string
  evaluation: LetterResult[]
}

export interface GuessTransformContext {
  enteredWord: string
  answer: string
  allowedWords: ReadonlySet<string>
  submittedWords: readonly string[]
}

export type GuessTransformer = (context: GuessTransformContext) => string

export type SubmitFailureReason = "incomplete" | "invalid" | "complete"

export type SubmitResult =
  | {
      ok: true
      row: number
      guess: SubmittedGuess
      displayWord: string
      status: PuzzleStatus
    }
  | {
      ok: false
      reason: SubmitFailureReason
    }

export interface PuzzleState {
  answer: string
  currentGuess: string
  guesses: readonly SubmittedGuess[]
  status: PuzzleStatus
}

export class Puzzle {
  answer: string
  private readonly allowedWords: ReadonlySet<string>
  private current = ""
  private submitted: SubmittedGuess[] = []
  private puzzleStatus: PuzzleStatus = "playing"
  private checkAgainstList: boolean

  constructor(answer: string, allowedWords: Iterable<string>, checkAgainstList = true) {
    this.answer = normalizeWord(answer)
    this.checkAgainstList = checkAgainstList
    if (this.answer.length !== WORD_LENGTH) {
      throw new Error(`Answer must contain ${WORD_LENGTH} letters`)
    }

    this.allowedWords = new Set(
      Array.from(allowedWords, normalizeWord).filter((word) => word.length === WORD_LENGTH),
    )
  }

  /** Development-only answer override. It does not reset guesses or status. */
  setDevAnswer(answerInput: string): void {
    const answer = normalizeWord(answerInput)
    if (answer.length === WORD_LENGTH) this.answer = answer
  }

  /** Development-only switch for testing arbitrary five-letter sequences. */
  setListChecking(enabled: boolean): void {
    this.checkAgainstList = enabled
  }

  get currentGuess(): string {
    return this.current
  }

  get guesses(): readonly SubmittedGuess[] {
    return this.submitted
  }

  get status(): PuzzleStatus {
    return this.puzzleStatus
  }

  typeLetter(letterInput: string): boolean {
    if (this.puzzleStatus !== "playing" || this.current.length >= WORD_LENGTH) return false

    const letter = normalizeWord(letterInput)
    if (!/^[A-Z]$/.test(letter)) return false

    this.current += letter
    return true
  }

  backspace(): boolean {
    if (this.puzzleStatus !== "playing" || this.current.length === 0) return false
    this.current = this.current.slice(0, -1)
    return true
  }

  submitGuess(transform?: GuessTransformer): SubmitResult {
    if (this.puzzleStatus !== "playing") {
      return { ok: false, reason: "complete" }
    }

    if (this.current.length !== WORD_LENGTH) {
      return { ok: false, reason: "incomplete" }
    }

    if (this.checkAgainstList && !this.allowedWords.has(this.current)) {
      return { ok: false, reason: "invalid" }
    }

    const enteredWord = this.current
    const transformedWord = normalizeWord(
      transform?.({
        enteredWord,
        answer: this.answer,
        allowedWords: this.allowedWords,
        submittedWords: this.submitted.map((guess) => guess.word),
      }) ?? enteredWord,
    )
    const displayWord =
      transformedWord.length === WORD_LENGTH &&
      (!this.checkAgainstList || this.allowedWords.has(transformedWord))
        ? transformedWord
        : enteredWord
    const guess: SubmittedGuess = {
      word: enteredWord,
      evaluation: evaluateGuess(enteredWord, this.answer),
    }
    const row = this.submitted.length

    this.submitted = [...this.submitted, guess]
    this.current = ""

    if (enteredWord === this.answer) {
      this.puzzleStatus = "won"
    } else if (this.submitted.length === MAX_GUESSES) {
      this.puzzleStatus = "lost"
    }

    return {
      ok: true,
      row,
      guess,
      displayWord,
      status: this.puzzleStatus,
    }
  }

  snapshot(): PuzzleState {
    return {
      answer: this.answer,
      currentGuess: this.current,
      guesses: this.submitted,
      status: this.puzzleStatus,
    }
  }
}
