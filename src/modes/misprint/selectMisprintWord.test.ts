import { describe, expect, it } from "vitest"
import { hammingDistance, selectMisprintWord } from "./selectMisprintWord"

describe("selectMisprintWord", () => {
  it("prefers a one-letter replacement over two-letter replacements", () => {
    expect(
      selectMisprintWord({
        enteredWord: "APPLE",
        answer: "CRANE",
        allowedWords: ["APPLE", "MAPLE", "AMPLE", "TABLE", "CRANE"],
        submittedWords: [],
        random: () => 0.99,
      }),
    ).toBe("AMPLE")
  })

  it("falls back to a two-letter replacement", () => {
    expect(
      selectMisprintWord({
        enteredWord: "APPLE",
        answer: "CRANE",
        allowedWords: ["APPLE", "MAPLE", "CRANE"],
        submittedWords: [],
      }),
    ).toBe("MAPLE")
  })

  it("does not repeat a displayed word or create the answer", () => {
    expect(
      selectMisprintWord({
        enteredWord: "APPLE",
        answer: "AMPLE",
        allowedWords: ["APPLE", "AMPLE", "MAPLE"],
        submittedWords: ["MAPLE"],
      }),
    ).toBe("APPLE")
  })

  it("never changes a correctly entered answer", () => {
    expect(
      selectMisprintWord({
        enteredWord: "APPLE",
        answer: "APPLE",
        allowedWords: ["APPLE", "AMPLE"],
        submittedWords: [],
      }),
    ).toBe("APPLE")
  })

  it("measures substitutions without allowing insertions or deletions", () => {
    expect(hammingDistance("SLATE", "PLATE")).toBe(1)
    expect(hammingDistance("SLATE", "LATE")).toBe(Number.POSITIVE_INFINITY)
  })
})
