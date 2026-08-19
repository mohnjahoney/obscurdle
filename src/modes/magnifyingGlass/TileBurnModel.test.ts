import { describe, expect, it } from "vitest"
import { GAME_LAYOUT, boardWidth } from "../../style/layout"
import { TileBurnModel } from "./TileBurnModel"

describe("TileBurnModel", () => {
  it("accumulates versioned heat only when the focal spot reaches its cell", () => {
    const burn = new TileBurnModel(0, 0, 1)
    const tileCenter = {
      x:
        (GAME_LAYOUT.width - boardWidth()) / 2 +
        GAME_LAYOUT.board.tileSize / 2,
      y: GAME_LAYOUT.board.top + GAME_LAYOUT.board.tileSize / 2,
    }
    expect(
      burn.applyExposure({ x: 0, y: 0 }, tileCenter, 0.1, 1.8),
    ).toBe(false)
    expect(burn.presentationState().version).toBe(0)

    expect(burn.applyExposure(tileCenter, tileCenter, 0.1, 1.8)).toBe(true)
    const state = burn.presentationState()
    expect(state.version).toBe(1)
    expect(Math.max(...state.heat)).toBeGreaterThan(0)
  })
})
