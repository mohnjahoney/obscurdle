import { describe, expect, it } from "vitest"
import { chooseSneakingColumn } from "./sneakingTileSelection"

describe("sneaking tile selection", () => {
  it("can select any letter when configured for random selection", () => {
    expect(chooseSneakingColumn(5, "random", () => 0)).toBe(0)
    expect(chooseSneakingColumn(5, "random", () => 0.41)).toBe(2)
    expect(chooseSneakingColumn(5, "random", () => 0.999)).toBe(4)
  })

  it("can later be restricted to the first or last letter", () => {
    expect(chooseSneakingColumn(5, "outer", () => 0.49)).toBe(0)
    expect(chooseSneakingColumn(5, "outer", () => 0.5)).toBe(4)
  })

  it("does not reuse a position excluded by the previous word", () => {
    const previousPosition = new Set([2])

    expect(
      chooseSneakingColumn(5, "random", () => 0.49, previousPosition),
    ).toBe(1)
    expect(
      chooseSneakingColumn(5, "random", () => 0.5, previousPosition),
    ).toBe(3)
  })

  it("respects the previous position with outer-only selection", () => {
    expect(
      chooseSneakingColumn(5, "outer", () => 0, new Set([0])),
    ).toBe(4)
    expect(
      chooseSneakingColumn(5, "outer", () => 0.99, new Set([4])),
    ).toBe(0)
  })
})
