import { describe, expect, it } from "vitest"
import { MisprintMode } from "./MisprintMode"

describe("MisprintMode", () => {
  it("records each legible cell once as presentation state", () => {
    const mode = new MisprintMode(() => 0)
    mode.start()

    expect(mode.presentationState()).toEqual({
      kind: "misprint",
      legibleCells: [],
    })
    expect(mode.onLetterLegible(1, 3)).toBe(true)
    expect(mode.onLetterLegible(1, 3)).toBe(false)
    expect(mode.onLetterLegible(1, 4)).toBe(true)
    expect(mode.presentationState()).toEqual({
      kind: "misprint",
      legibleCells: [
        { row: 1, column: 3 },
        { row: 1, column: 4 },
      ],
    })

    mode.stop()
    expect(mode.presentationState().legibleCells).toEqual([])
  })
})
