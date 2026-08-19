import { describe, expect, it } from "vitest"
import type { ModeContext } from "../ObscuringMode"
import { SneakingTilesMode } from "./SneakingTilesMode"

describe("SneakingTilesMode", () => {
  it("chooses a different column for consecutive submitted words", () => {
    const mode = new SneakingTilesMode(() => 0)
    const context = {
      scene: { time: { now: 1_000 } },
    } as ModeContext

    mode.start(context)
    mode.onGuessSubmitted(context, 0)
    context.scene.time.now = 2_000
    mode.onGuessSubmitted(context, 1)

    const presentation = mode.presentationState()
    expect(presentation.motions.map((motion) => motion.column)).toEqual([0, 1])
    expect(presentation.motions.map((motion) => motion.row)).toEqual([0, 1])

    const firstStart = presentation.motions[0]?.segments[0]?.startsAt
    expect(firstStart).toBeDefined()
    context.scene.time.now = firstStart!
    expect(mode.update(context)).toBe(true)

    mode.stop()
    expect(mode.presentationState().motions).toEqual([])
  })
})
