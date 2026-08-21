import { describe, expect, it } from "vitest"
import type { ModeContext } from "../ObscuringMode"
import { MisprintMode } from "./MisprintMode"

describe("MisprintMode", () => {
  it("records each legible cell once as presentation state", () => {
    const mode = new MisprintMode(() => 0)
    mode.start()

    expect(mode.presentationState()).toEqual({
      kind: "misprint",
      displayWords: [],
      legibleCells: [],
    })
    expect(mode.onLetterLegible(1, 3)).toBe(true)
    expect(mode.onLetterLegible(1, 3)).toBe(false)
    expect(mode.onLetterLegible(1, 4)).toBe(true)
    expect(mode.presentationState()).toEqual({
      kind: "misprint",
      displayWords: [],
      legibleCells: [
        { row: 1, column: 3 },
        { row: 1, column: 4 },
      ],
    })

    mode.onGuessSubmitted({} as ModeContext, 0, "CRANE")
    expect(mode.presentationState().displayWords).toEqual([
      { row: 0, word: "CRANE" },
    ])

    mode.stop()
    expect(mode.presentationState().legibleCells).toEqual([])
  })
})
