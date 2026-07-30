import { describe, expect, it } from "vitest"
import {
  candleBurnStateAt,
  gaussianIlluminationAtDistance,
} from "./candleBurn"
import { CANDLELIGHT_CONFIG } from "./candlelightConfig"
import {
  smoothValueNoiseProvider,
} from "./candleNoise"
import { sampleCandleSource } from "./candleSource"
import { buildCandleMaskFragmentShader } from "./candlelightShader"

describe("candle burn state", () => {
  it("begins broad, bright, stable, and with only a hint of smoke", () => {
    const state = candleBurnStateAt(0)

    expect(state.progress).toBe(0)
    expect(state.sourceBrightnessBaseline).toBe(1)
    expect(state.sourceRadiusBaseline).toBe(0.61)
    expect(state.sourceRadiusWiggleAmplitude).toBeLessThan(0.02)
    expect(state.smokeAmount).toBeGreaterThan(0)
    expect(state.smokeSputter).toBe(0)
  })

  it("declines gradually through the long middle phases", () => {
    const phaseTwo = candleBurnStateAt(
      CANDLELIGHT_CONFIG.burnDurationMs * 0.75,
    )
    const phaseThree = candleBurnStateAt(
      CANDLELIGHT_CONFIG.burnDurationMs * 0.95,
    )

    expect(phaseThree.sourceBrightnessBaseline).toBeLessThan(
      phaseTwo.sourceBrightnessBaseline,
    )
    expect(phaseThree.sourceRadiusBaseline).toBeLessThan(
      phaseTwo.sourceRadiusBaseline,
    )
    expect(phaseThree.warmth).toBeGreaterThan(phaseTwo.warmth)
    expect(phaseThree.smokeAmount).toBeGreaterThan(
      phaseTwo.smokeAmount,
    )
  })

  it("derives phase-four excursions from ordinary noise parameters", () => {
    const beforeFinal = candleBurnStateAt(
      CANDLELIGHT_CONFIG.burnDurationMs * 0.95,
    )
    const final = candleBurnStateAt(
      CANDLELIGHT_CONFIG.burnDurationMs,
    )

    expect(final.sourceRadiusWiggleAmplitude).toBeGreaterThan(
      beforeFinal.sourceRadiusWiggleAmplitude,
    )
    expect(final.sourceBrightnessWiggleAmplitude).toBeGreaterThan(
      beforeFinal.sourceBrightnessWiggleAmplitude,
    )
    expect(final.radiusBrightnessNoiseCorrelation).toBeGreaterThan(0.8)
    expect(final.sourceFastFlickerAmplitude).toBeGreaterThan(
      beforeFinal.sourceFastFlickerAmplitude,
    )
    expect(final.extinction).toBe(0)
    expect(final.sourceBrightnessBaseline).toBe(0)
  })

  it("keeps the Gaussian radially monotonic", () => {
    const samples = Array.from({ length: 100 }, (_, index) =>
      gaussianIlluminationAtDistance(index / 100, 0.4, 0.8),
    )

    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeLessThanOrEqual(samples[index - 1]!)
    }
  })

  it("builds one Gaussian with no pulse or secondary field", () => {
    const source = buildCandleMaskFragmentShader()

    expect(source).toContain(
      "uSourceBrightness * exp(",
    )
    expect(source).not.toMatch(/pulse/i)
    expect(source).not.toContain("broadPulseIllumination")
    expect(source).not.toContain("max(radialLight")
  })

  it("uses deterministic, replaceable temporal noise", () => {
    const state = candleBurnStateAt(91_000)
    const first = sampleCandleSource(
      91,
      state,
      12.5,
      smoothValueNoiseProvider,
    )
    const second = sampleCandleSource(
      91,
      state,
      12.5,
      smoothValueNoiseProvider,
    )
    const replacement = sampleCandleSource(91, state, 12.5, {
      id: "test-constant",
      sample: () => 0,
    })

    expect(second).toEqual(first)
    expect(replacement.center).toEqual(
      CANDLELIGHT_CONFIG.sourceCenterBaseline,
    )
    expect(replacement.sigma).toBe(state.sourceRadiusBaseline)
    expect(replacement.brightness).toBe(
      state.sourceBrightnessBaseline,
    )
  })

  it("keeps noise continuous across phase boundaries", () => {
    for (const boundary of CANDLELIGHT_CONFIG.phaseEnds.slice(0, 3)) {
      const beforeMs =
        CANDLELIGHT_CONFIG.burnDurationMs * boundary - 0.001
      const afterMs =
        CANDLELIGHT_CONFIG.burnDurationMs * boundary + 0.001
      const before = sampleCandleSource(
        beforeMs / 1_000,
        candleBurnStateAt(beforeMs),
        884,
      )
      const after = sampleCandleSource(
        afterMs / 1_000,
        candleBurnStateAt(afterMs),
        884,
      )

      expect(Math.abs(after.sigma - before.sigma)).toBeLessThan(0.0001)
      expect(
        Math.abs(after.brightness - before.brightness),
      ).toBeLessThan(0.0001)
    }
  })
})
