import { describe, expect, it } from "vitest"
import { FADING_INK_CONFIG } from "./fadingInkConfig"
import {
  createRowFadeSchedule,
  letterInkAlphaAt,
  rowFadeStartsAt,
} from "./fadingInkSchedule"

describe("Fading Ink schedule", () => {
  it("samples only the per-letter start delay", () => {
    const randomValues = [0, 0.25, 0.5, 0.75, 0.999]
    let nextValue = 0
    const schedule = createRowFadeSchedule(
      1_000,
      randomValues.length,
      () => randomValues[nextValue++] ?? 0,
    )

    expect(schedule).toEqual({
      submittedAt: 1_000,
      letterStartDelaysMs: randomValues.map(
        (value) => value * FADING_INK_CONFIG.letterStartJitterMaxMs,
      ),
    })
  })

  it("keeps a letter fully visible through its grace period and start delay", () => {
    const schedule = {
      submittedAt: 2_000,
      letterStartDelaysMs: [3_000],
    }
    const fadeStartsAt =
      schedule.submittedAt +
      FADING_INK_CONFIG.gracePeriodMs +
      schedule.letterStartDelaysMs[0]!

    expect(letterInkAlphaAt(schedule, 0, fadeStartsAt - 1)).toBe(1)
    expect(letterInkAlphaAt(schedule, 0, fadeStartsAt)).toBe(1)
  })

  it("fades linearly for the configured fixed duration", () => {
    const schedule = {
      submittedAt: 0,
      letterStartDelaysMs: [2_000],
    }
    const fadeStartsAt =
      FADING_INK_CONFIG.gracePeriodMs +
      schedule.letterStartDelaysMs[0]!

    expect(
      letterInkAlphaAt(
        schedule,
        0,
        fadeStartsAt + FADING_INK_CONFIG.fadeDurationMs / 2,
      ),
    ).toBe(0.5)
    expect(
      letterInkAlphaAt(
        schedule,
        0,
        fadeStartsAt + FADING_INK_CONFIG.fadeDurationMs,
      ),
    ).toBe(0)
  })

  it("identifies when the earliest letter in a row starts fading", () => {
    const schedule = {
      submittedAt: 1_000,
      letterStartDelaysMs: [3_000, 2_000, 750, 1_500, 2_500],
    }

    expect(rowFadeStartsAt(schedule)).toBe(
      1_000 + FADING_INK_CONFIG.gracePeriodMs + 750,
    )
  })
})
