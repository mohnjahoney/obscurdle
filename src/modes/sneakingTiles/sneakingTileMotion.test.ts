import { describe, expect, it } from "vitest"
import {
  createSneakingTileMotion,
  sampleSneakingTileMotion,
  sneakingMotionChangesBetween,
} from "./sneakingTileMotion"

describe("Sneaking tile motion", () => {
  it("builds horizontal creep segments that end offscreen", () => {
    const motion = createSneakingTileMotion(1, 0, 1_000, () => 0)
    const finalSegment = motion.segments.at(-1)

    expect(motion.row).toBe(1)
    expect(motion.column).toBe(0)
    expect(motion.segments.length).toBeGreaterThan(1)
    expect(finalSegment?.toOffsetX).toBeLessThan(0)
    expect(
      motion.segments.every(
        (segment) => segment.toOffsetX < segment.fromOffsetX,
      ),
    ).toBe(true)
  })

  it("holds still, eases horizontally, and remains at its destination", () => {
    const motion = {
      row: 0,
      column: 2,
      segments: [
        {
          startsAt: 2_000,
          durationMs: 1_000,
          fromOffsetX: 0,
          toOffsetX: 10,
        },
      ],
    }

    expect(sampleSneakingTileMotion(motion, 1_999)).toEqual({
      offsetX: 0,
      depthOffset: 0,
    })
    const midway = sampleSneakingTileMotion(motion, 2_500)
    expect(midway.offsetX).toBeCloseTo(5)
    expect(midway.depthOffset).toBe(-1)
    expect(sampleSneakingTileMotion(motion, 4_000)).toEqual({
      offsetX: 10,
      depthOffset: -1,
    })
  })

  it("invalidates only during motion and when crossing boundaries", () => {
    const motion = {
      row: 0,
      column: 0,
      segments: [
        {
          startsAt: 2_000,
          durationMs: 1_000,
          fromOffsetX: 0,
          toOffsetX: -10,
        },
      ],
    }

    expect(sneakingMotionChangesBetween(motion, 1_000, 1_500)).toBe(false)
    expect(sneakingMotionChangesBetween(motion, 1_999, 2_000)).toBe(true)
    expect(sneakingMotionChangesBetween(motion, 2_200, 2_300)).toBe(true)
    expect(sneakingMotionChangesBetween(motion, 3_000, 3_500)).toBe(false)
  })
})
