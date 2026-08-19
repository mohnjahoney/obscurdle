import { describe, expect, it, vi } from "vitest"
import type { ModeContext } from "../ObscuringMode"
import { FLASHLIGHT_CONFIG } from "./flashlightConfig"
import { FlashlightMode } from "./FlashlightMode"

describe("FlashlightMode", () => {
  it("exposes controller state without creating effects in the mode", () => {
    const input = { on: vi.fn(), off: vi.fn() }
    const context = {
      scene: {
        game: { renderer: { type: -1 } },
        input,
        time: { now: 1_000 },
      },
    } as unknown as ModeContext
    const mode = new FlashlightMode()

    mode.start(context)
    expect(mode.presentationState()).toMatchObject({
      kind: "flashlight",
      active: true,
      distribution: FLASHLIGHT_CONFIG.distribution,
      target: FLASHLIGHT_CONFIG.initialTarget,
      uniformOverrides: {},
    })
    expect(mode.update(context)).toBe(true)
    expect(input.on).toHaveBeenCalledTimes(3)
    expect(mode.onSceneEffectControlChange("uSpillStrength", 0.03)).toBe(true)
    expect(mode.presentationState().uniformOverrides).toEqual({
      uSpillStrength: 0.03,
    })

    mode.stop(context)
    expect(mode.presentationState().active).toBe(false)
  })
})
