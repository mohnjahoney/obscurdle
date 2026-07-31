import { describe, expect, it } from "vitest"
import { GAME_LAYOUT, boardWidth } from "../../style/layout"
import { LensMotionModel } from "./LensMotionModel"

describe("magnifying-glass motion", () => {
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
