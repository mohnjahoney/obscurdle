import { describe, expect, it, vi } from "vitest"
import nytAdditionalGuesses from "./wordlists/nytAdditionalGuesses.json"
import nytAnswers from "./wordlists/nytAnswers.json"
import { BundledWordSource } from "./words"

describe("BundledWordSource", () => {
  it("bundles the NYT answer and additional-guess lists", () => {
    const source = new BundledWordSource()
    const allowedWords = source.allowedWords()

    expect(nytAnswers).toHaveLength(2_309)
    expect(nytAdditionalGuesses).toHaveLength(10_638)
    expect(allowedWords.size).toBe(12_947)
    expect(allowedWords.has("CIGAR")).toBe(true)
    expect(allowedWords.has("AAHED")).toBe(true)
  })

  it("chooses answers only from the answer list", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    const source = new BundledWordSource()

    expect(source.chooseAnswer()).toBe("CIGAR")
    expect(nytAnswers).toContain(source.chooseAnswer().toLowerCase())

    vi.restoreAllMocks()
  })
})
