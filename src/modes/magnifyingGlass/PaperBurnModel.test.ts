import { describe, expect, it } from "vitest"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"
import { PaperBurnModel } from "./PaperBurnModel"

describe("PaperBurnModel", () => {
  it("accumulates one continuous field at the lens position", () => {
    const model = new PaperBurnModel()
    const surface = MAGNIFYING_GLASS_CONFIG.burn.paperSurface
    const focalPoint = {
      x: (surface.left + surface.right) / 2,
      y: (surface.top + surface.bottom) / 2,
    }

    expect(model.applyExposure(focalPoint, 0.1, 1.8)).toBe(true)
    const state = model.presentationState()
    expect(state.version).toBe(1)
    expect(Math.max(...state.heat)).toBeGreaterThan(0)
  })

  it("does not change when the lens is outside the paper surface", () => {
    const model = new PaperBurnModel()

    expect(model.applyExposure({ x: -100, y: -100 }, 0.1, 1.8)).toBe(false)
    expect(model.presentationState().version).toBe(0)
  })
})
