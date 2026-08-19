import { describe, expect, it } from "vitest"
import type { ModeContext } from "./ObscuringMode"
import { FadingInkMode } from "./FadingInkMode"
import { FADING_INK_CONFIG } from "./fadingInkConfig"

describe("FadingInkMode", () => {
  it("owns schedules but exposes them as presentation state", () => {
    const mode = new FadingInkMode()
    const context = {
      scene: { time: { now: 2_500 } },
    } as ModeContext

    mode.start()
    expect(mode.presentationState()).toEqual({ kind: "fading-ink", rows: [] })
    expect(mode.update(context)).toBe(false)

    mode.onGuessSubmitted(context, 2)
    expect(mode.presentationState()).toEqual({
      kind: "fading-ink",
      rows: [
        {
          row: 2,
          submittedAt: 2_500,
          letterStartDelaysMs: [0, 0, 0, 0, 0],
        },
      ],
    })
    expect(mode.update(context)).toBe(false)

    context.scene.time.now = 2_500 + FADING_INK_CONFIG.gracePeriodMs
    expect(mode.update(context)).toBe(true)

    context.scene.time.now += FADING_INK_CONFIG.fadeDurationMs + 1
    expect(mode.update(context)).toBe(true)
    expect(mode.update(context)).toBe(false)

    mode.stop()
    expect(mode.presentationState().rows).toEqual([])
  })
})
