import { describe, expect, it, vi } from "vitest"
import type { ModeContext } from "../ObscuringMode"
import {
  MagnifyingGlassMode,
} from "./MagnifyingGlassMode"
import { MAGNIFYING_GLASS_CONTROL } from "./magnifyingGlassConfig"

describe("MagnifyingGlassMode", () => {
  it("owns lens motion and burn heat without creating render objects", () => {
    const input = { on: vi.fn(), off: vi.fn() }
    let boardPresentation: "tiles" | "bare" = "tiles"
    const context = {
      scene: { input, time: { now: 1_000 } },
      boardPresentation: () => boardPresentation,
      letterBasePlacementAt: (row: number, column: number) => ({
        x: 101 + column * 58,
        y: 141 + row * 58,
      }),
    } as unknown as ModeContext
    const mode = new MagnifyingGlassMode()

    mode.start(context)
    expect(mode.presentationState()).toMatchObject({
      kind: "magnifying-glass",
      active: true,
      burnRate: 1.26,
      automaticMotion: true,
      burns: [],
      paperBurn: { version: 0 },
    })
    expect(input.on).toHaveBeenCalledTimes(3)

    mode.onGuessSubmitted(context, 0)
    expect(mode.presentationState().burns).toHaveLength(5)
    for (let frame = 0; frame < 85; frame += 1) {
      expect(mode.update(context, 100)).toBe(true)
    }
    expect(
      mode.presentationState().burns.some((burn) => burn.version > 0),
    ).toBe(true)
    expect(mode.presentationState().paperBurn.version).toBe(0)

    const tileVersions = mode
      .presentationState()
      .burns.map((burn) => burn.version)
    boardPresentation = "bare"
    expect(mode.update(context, 100)).toBe(true)
    expect(mode.presentationState().paperBurn.version).toBeGreaterThan(0)
    expect(
      mode.presentationState().burns.map((burn) => burn.version),
    ).toEqual(tileVersions)

    expect(
      mode.onSceneEffectControlChange(
        MAGNIFYING_GLASS_CONTROL.burnRate,
        4.4,
      ),
    ).toBe(true)
    expect(
      mode.onSceneEffectControlChange(
        MAGNIFYING_GLASS_CONTROL.automaticMotion,
        0,
      ),
    ).toBe(true)
    expect(mode.presentationState()).toMatchObject({
      burnRate: 4.4,
      automaticMotion: false,
    })

    mode.stop(context)
    expect(mode.presentationState()).toMatchObject({
      active: false,
      burns: [],
      paperBurn: { version: 0 },
    })
    expect(input.off).toHaveBeenCalledTimes(6)
  })
})
