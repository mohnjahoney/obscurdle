import { describe, expect, it } from "vitest"
import { FLASHLIGHT_DISTRIBUTIONS } from "./distributions/registry"
import {
  buildFlashlightConeFragmentShader,
  buildFlashlightFragmentShader,
} from "./flashlightShader"

describe("flashlight distributions", () => {
  it("builds the shared overlay around every registered distribution", () => {
    for (const distribution of Object.values(FLASHLIGHT_DISTRIBUTIONS)) {
      const shader = buildFlashlightFragmentShader(distribution)
      const coneShader = buildFlashlightConeFragmentShader(distribution)

      expect(shader).toContain("float flashlightDistribution(")
      expect(shader).toContain("float flashlightVisualCone(")
      expect(shader).toContain("float keyboardFlashlightDistribution(")
      expect(shader).toContain("float keyboardBeam")
      expect(shader).toContain(distribution.fragmentSource)
      expect(coneShader).toContain("flashlightVisualCone(")
      expect(coneShader).toContain(distribution.fragmentSource)
    }
  })

  it("keeps materially different distributions available for comparison", () => {
    expect(Object.keys(FLASHLIGHT_DISTRIBUTIONS)).toEqual([
      "material-cone",
      "classic-circle",
    ])
  })
})
