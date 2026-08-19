import { describe, expect, it } from "vitest"
import { GAME_LAYOUT, boardWidth } from "../../style/layout"
import { LensMotionModel } from "./LensMotionModel"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"

describe("magnifying-glass motion", () => {
  it("waits five seconds after the first submission before entering", () => {
    const motion = new LensMotionModel(42)
    const parked = motion.position
    expect(parked.y).toBeGreaterThan(GAME_LAYOUT.height)
    expect(motion.phase).toBe("parked")

    motion.setSubmittedRows(1)
    expect(motion.phase).toBe("waiting")
    for (let elapsed = 0; elapsed < 4_900; elapsed += 100) {
      expect(motion.update(100)).toEqual(parked)
    }
    expect(motion.update(100)).toEqual(parked)
    expect(motion.phase).toBe("entering")

    expect(motion.update(100).y).toBeLessThan(parked.y)
  })

  it("hands off to normal roaming after rising onto the board", () => {
    const motion = new LensMotionModel(42)
    motion.setSubmittedRows(1)
    const totalEntranceMs =
      MAGNIFYING_GLASS_CONFIG.motion.entrance
        .delayAfterFirstSubmissionMs +
      MAGNIFYING_GLASS_CONFIG.motion.entrance.durationMs

    for (let elapsed = 0; elapsed < totalEntranceMs; elapsed += 100) {
      motion.update(100)
    }

    expect(motion.phase).toBe("roaming")
    expect(motion.position.y).toBeLessThan(GAME_LAYOUT.board.top + 60)
  })

  it("is reproducible for a seed", () => {
    const first = new LensMotionModel(42)
    const second = new LensMotionModel(42)
    first.setSubmittedRows(3)
    second.setSubmittedRows(3)

    for (let frame = 0; frame < 120; frame += 1) {
      expect(first.update(16)).toEqual(second.update(16))
    }
  })

  it("stays within the board's horizontal region", () => {
    const motion = new LensMotionModel(9)
    motion.setSubmittedRows(6)
    const boardLeft = (GAME_LAYOUT.width - boardWidth()) / 2
    const boardRight = boardLeft + boardWidth()

    for (let frame = 0; frame < 2_000; frame += 1) {
      const position = motion.update(16)
      expect(position.x).toBeGreaterThan(boardLeft)
      expect(position.x).toBeLessThan(boardRight)
    }
  })

  it("resumes automatic movement from a manually chosen position", () => {
    const motion = new LensMotionModel(17)
    motion.setSubmittedRows(4)
    const manualPosition = { x: 120, y: 250 }

    motion.reposition(manualPosition)

    expect(motion.position).toEqual(manualPosition)
    const resumedPosition = motion.update(16)
    expect(Math.hypot(
      resumedPosition.x - manualPosition.x,
      resumedPosition.y - manualPosition.y,
    )).toBeLessThan(1)
  })
})
