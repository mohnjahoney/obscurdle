import { describe, expect, it } from "vitest"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"
import { paperApertureAmountAtHeat } from "./paperAperturePainter"

describe("paper aperture", () => {
  it("does not perforate ordinary charred paper", () => {
    expect(
      paperApertureAmountAtHeat(
        MAGNIFYING_GLASS_CONFIG.burn.perforationStartsAt - 0.01,
      ),
    ).toBe(0)
  })

  it("opens monotonically after excessive heat", () => {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    const partial = paperApertureAmountAtHeat(
      (burn.perforationStartsAt + burn.openHoleAt) / 2,
    )

    expect(partial).toBeGreaterThan(0)
    expect(partial).toBeLessThan(1)
    expect(paperApertureAmountAtHeat(burn.openHoleAt)).toBe(1)
    expect(paperApertureAmountAtHeat(burn.maximumHeat)).toBe(1)
  })
})
