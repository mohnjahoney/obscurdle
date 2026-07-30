import { describe, expect, it } from "vitest"
import { MAX_GUESSES, Puzzle } from "./Puzzle"

const WORDS = ["APPLE", "CRANE", "SLATE", "STARE", "TRAIN", "WORLD", "POINT"]

function enterWord(puzzle: Puzzle, word: string): void {
  for (const letter of word) {
    expect(puzzle.typeLetter(letter)).toBe(true)
  }
}

describe("Puzzle", () => {
  it("advances after a valid guess and clears the current row", () => {
    const puzzle = new Puzzle("APPLE", WORDS)
    enterWord(puzzle, "CRANE")

    const result = puzzle.submitGuess()

    expect(result.ok).toBe(true)
    expect(puzzle.guesses).toHaveLength(1)
    expect(puzzle.currentGuess).toBe("")
    expect(puzzle.status).toBe("playing")
  })

  it("rejects incomplete and invalid guesses", () => {
    const puzzle = new Puzzle("APPLE", WORDS)
    enterWord(puzzle, "APP")
    expect(puzzle.submitGuess()).toEqual({ ok: false, reason: "incomplete" })

    puzzle.backspace()
    puzzle.backspace()
    puzzle.backspace()
    enterWord(puzzle, "ZZZZZ")
    expect(puzzle.submitGuess()).toEqual({ ok: false, reason: "invalid" })
  })

  it("transitions to won", () => {
    const puzzle = new Puzzle("APPLE", WORDS)
    enterWord(puzzle, "APPLE")

    expect(puzzle.submitGuess()).toMatchObject({ ok: true, status: "won" })
    expect(puzzle.status).toBe("won")
  })

  it("scores and stores a transformed word while preserving what was entered", () => {
    const puzzle = new Puzzle("APPLE", WORDS)
    enterWord(puzzle, "SLATE")

    const result = puzzle.submitGuess(() => "STARE")

    expect(result).toMatchObject({
      ok: true,
      guess: {
        enteredWord: "SLATE",
        word: "STARE",
      },
    })
    expect(puzzle.guesses[0]?.evaluation).toEqual([
      "absent",
      "absent",
      "present",
      "absent",
      "correct",
    ])
  })

  it("falls back to the entered word if a transformer returns an invalid word", () => {
    const puzzle = new Puzzle("APPLE", WORDS)
    enterWord(puzzle, "SLATE")

    const result = puzzle.submitGuess(() => "XXXXX")

    expect(result).toMatchObject({
      ok: true,
      guess: {
        enteredWord: "SLATE",
        word: "SLATE",
      },
    })
  })

  it("transitions to lost after the sixth guess", () => {
    const puzzle = new Puzzle("APPLE", WORDS)
    const misses = ["CRANE", "SLATE", "STARE", "TRAIN", "WORLD", "POINT"]

    for (const word of misses) {
      enterWord(puzzle, word)
      puzzle.submitGuess()
    }

    expect(puzzle.guesses).toHaveLength(MAX_GUESSES)
    expect(puzzle.status).toBe("lost")
  })

  it("rejects input and submissions after completion", () => {
    const puzzle = new Puzzle("APPLE", WORDS)
    enterWord(puzzle, "APPLE")
    puzzle.submitGuess()

    expect(puzzle.typeLetter("A")).toBe(false)
    expect(puzzle.backspace()).toBe(false)
    expect(puzzle.submitGuess()).toEqual({ ok: false, reason: "complete" })
  })
})
