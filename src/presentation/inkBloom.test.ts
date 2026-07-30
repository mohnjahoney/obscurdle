import { describe, expect, it } from "vitest"
import { GAME_MOTION } from "../style/motion"
import { createInkBloomParameters } from "./inkBloom"

describe("ink bloom parameters", () => {
  it("samples a bounded impact point and stable seed once", () => {
    const samples = [0, 1, 0.25]
    let index = 0
    const parameters = createInkBloomParameters(() => samples[index++] ?? 0)
    const jitter = GAME_MOTION.tile.inkBloom.originJitter

    expect(parameters).toEqual({
      origin: [0.5 - jitter, 0.5 + jitter],
      seed: 0.25 * GAME_MOTION.tile.inkBloom.seedRange,
    })
  })
})
