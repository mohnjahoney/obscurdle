import { describe, expect, it } from "vitest"
import type { ModeContext } from "../ObscuringMode"
import { candleBurnStateAt } from "./candleBurn"
import { CandlelightMode } from "./CandlelightMode"
import { sampleCandleSource } from "./candleSource"

describe("CandlelightMode", () => {
  it("exposes the evolving candle model without owning scene effects", () => {
    const context = {
      scene: { time: { now: 1_000 } },
    } as ModeContext
    const mode = new CandlelightMode(() => 0.25)

    mode.start(context)
    const initialBurn = candleBurnStateAt(0)
    expect(mode.presentationState()).toEqual({
      kind: "candlelight",
      active: true,
      noiseSeed: 2_500,
      burn: initialBurn,
      source: sampleCandleSource(0, initialBurn, 2_500),
    })

    context.scene.time.now = 31_000
    expect(mode.update(context)).toBe(true)
    const evolved = mode.presentationState()
    expect(evolved.burn.progress).toBe(0.25)
    expect(evolved.source).toEqual(
      sampleCandleSource(30, evolved.burn, 2_500),
    )

    mode.stop()
    expect(mode.presentationState().active).toBe(false)
    expect(mode.update(context)).toBe(false)
  })
})
