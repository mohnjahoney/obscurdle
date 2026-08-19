import { describe, expect, it } from "vitest"
import { resolveLetterBasePlacement } from "./boardLayout"

describe("resolveLetterBasePlacement", () => {
  it("uses the established grid as the tile base", () => {
    expect(resolveLetterBasePlacement("tiles", 0, 0, "ALERT")).toEqual({
      x: 101,
      y: 141,
    })
    expect(resolveLetterBasePlacement("tiles", 1, 1, "ALERT")).toEqual({
      x: 158,
      y: 198,
    })
  })

  it("uses compact, deterministic word placement as the bare-letter base", () => {
    const first = resolveLetterBasePlacement("bare", 0, 0, "ALERT")
    const second = resolveLetterBasePlacement("bare", 0, 1, "ALERT")
    const repeat = resolveLetterBasePlacement("bare", 0, 1, "ALERT")

    expect(second).toEqual(repeat)
    expect(second.x - first.x).toBeLessThan(58)
    expect(second.y).not.toBe(first.y)
  })

  it("uses the measured word's kerning when placing separate letters", () => {
    const widthsWithKerning: Record<string, number> = {
      A: 20,
      V: 20,
      AV: 36,
    }
    const widthsWithoutKerning: Record<string, number> = {
      A: 20,
      V: 20,
      AV: 40,
    }
    const kerned = resolveLetterBasePlacement(
      "bare",
      0,
      1,
      "AV",
      (text) => widthsWithKerning[text] ?? 0,
    )
    const unkerned = resolveLetterBasePlacement(
      "bare",
      0,
      1,
      "AV",
      (text) => widthsWithoutKerning[text] ?? 0,
    )

    expect(kerned.x).toBe(unkerned.x - 4)
  })

  it("keeps mode-independent base placement distinct from transforms", () => {
    const tile = resolveLetterBasePlacement("tiles", 2, 3, "ALERT")
    const bare = resolveLetterBasePlacement("bare", 2, 3, "ALERT")

    expect(bare).not.toEqual(tile)
    expect(bare).toEqual(
      resolveLetterBasePlacement("bare", 2, 3, "ALERT"),
    )
  })
})
