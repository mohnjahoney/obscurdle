import { describe, expect, it } from "vitest"
import { accumulatedHeat, radialHeatAtDistance } from "./burnExposure"

const OPTIONS = {
  radius: 10,
  intensity: 1,
  gainPerSecond: 0.8,
  maximumHeat: 3,
}

describe("magnifying-glass burn exposure", () => {
  it("decreases monotonically with distance", () => {
    const samples = [0, 5, 10, 20].map((distance) =>
      radialHeatAtDistance(distance, OPTIONS.radius),
    )

    expect(samples[0]).toBeGreaterThan(samples[1]!)
    expect(samples[1]).toBeGreaterThan(samples[2]!)
    expect(samples[2]).toBeGreaterThan(samples[3]!)
  })

  it("is independent of frame subdivision", () => {
    const oneFrame = accumulatedHeat(0, 4, 1, OPTIONS)
    const firstHalf = accumulatedHeat(0, 4, 0.5, OPTIONS)
    const twoFrames = accumulatedHeat(firstHalf, 4, 0.5, OPTIONS)

    expect(twoFrames).toBeCloseTo(oneFrame, 10)
  })

  it("never cools or exceeds the configured maximum", () => {
    const warmed = accumulatedHeat(0.5, 0, 1, OPTIONS)
    const capped = accumulatedHeat(warmed, 0, 100, OPTIONS)

    expect(warmed).toBeGreaterThan(0.5)
    expect(capped).toBe(OPTIONS.maximumHeat)
  })
})
