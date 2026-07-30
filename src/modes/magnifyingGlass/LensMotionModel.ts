import { GAME_LAYOUT } from "../../style/layout"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"

export interface LensPoint {
  x: number
  y: number
}

function smootherStep(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1)
  return (
    clamped *
    clamped *
    clamped *
    (clamped * (clamped * 6 - 15) + 10)
  )
}

function distanceBetween(first: LensPoint, second: LensPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

export class LensMotionModel {
  private readonly random: () => number
  private positionValue: LensPoint
  private segmentStart: LensPoint
  private segmentTarget: LensPoint
  private segmentElapsedMs = 0
  private segmentDurationMs = 1
  private pauseRemainingMs = 0
  private submittedRows = 0

  constructor(seed = Math.random() * 1_000_000) {
    let state = Math.floor(seed) || 1
    this.random = () => {
      state |= 0
      state = (state + 0x6d2b79f5) | 0
      let value = Math.imul(state ^ (state >>> 15), 1 | state)
      value =
        value +
        Math.imul(value ^ (value >>> 7), 61 | value) ^
        value
      return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
    }

    const bounds = MAGNIFYING_GLASS_CONFIG.motion.bounds
    this.positionValue = {
      x: (bounds.left + bounds.right) / 2,
      y: GAME_LAYOUT.board.top + GAME_LAYOUT.board.tileSize / 2,
    }
    this.segmentStart = { ...this.positionValue }
    this.segmentTarget = { ...this.positionValue }
    this.chooseNextSegment()
  }

  setSubmittedRows(rowCount: number): void {
    this.submittedRows = Math.min(
      Math.max(rowCount, 0),
      GAME_LAYOUT.board.rows,
    )
  }

  update(deltaMs: number): LensPoint {
    let remainingMs = Math.min(Math.max(deltaMs, 0), 100)

    while (remainingMs > 0) {
      if (this.pauseRemainingMs > 0) {
        const consumed = Math.min(remainingMs, this.pauseRemainingMs)
        this.pauseRemainingMs -= consumed
        remainingMs -= consumed
        if (remainingMs === 0) break
      }

      const segmentRemaining =
        this.segmentDurationMs - this.segmentElapsedMs
      const consumed = Math.min(remainingMs, segmentRemaining)
      this.segmentElapsedMs += consumed
      remainingMs -= consumed

      const amount = smootherStep(
        this.segmentElapsedMs / this.segmentDurationMs,
      )
      this.positionValue = {
        x:
          this.segmentStart.x +
          (this.segmentTarget.x - this.segmentStart.x) * amount,
        y:
          this.segmentStart.y +
          (this.segmentTarget.y - this.segmentStart.y) * amount,
      }

      if (this.segmentElapsedMs >= this.segmentDurationMs) {
        this.positionValue = { ...this.segmentTarget }
        this.pauseRemainingMs = this.randomBetween(
          MAGNIFYING_GLASS_CONFIG.motion.minimumPauseMs,
          MAGNIFYING_GLASS_CONFIG.motion.maximumPauseMs,
        )
        this.chooseNextSegment()
      }
    }

    return { ...this.positionValue }
  }

  get position(): LensPoint {
    return { ...this.positionValue }
  }

  private chooseNextSegment(): void {
    this.segmentStart = { ...this.positionValue }
    let candidate = this.randomTarget()

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const distance = distanceBetween(this.segmentStart, candidate)
      if (
        distance >=
          MAGNIFYING_GLASS_CONFIG.motion.minimumTargetDistance &&
        distance <=
          MAGNIFYING_GLASS_CONFIG.motion.maximumTargetDistance
      ) {
        break
      }
      candidate = this.randomTarget()
    }

    this.segmentTarget = candidate
    this.segmentElapsedMs = 0
    const speed = this.randomBetween(
      MAGNIFYING_GLASS_CONFIG.motion.minimumSpeed,
      MAGNIFYING_GLASS_CONFIG.motion.maximumSpeed,
    )
    this.segmentDurationMs =
      Math.max(distanceBetween(this.segmentStart, candidate), 1) /
      speed *
      1_000
  }

  private randomTarget(): LensPoint {
    const bounds = MAGNIFYING_GLASS_CONFIG.motion.bounds
    const rowCount = Math.max(this.submittedRows, 1)
    const rowStep =
      GAME_LAYOUT.board.tileSize + GAME_LAYOUT.board.gap
    const activeBottom =
      GAME_LAYOUT.board.top +
      (rowCount - 1) * rowStep +
      GAME_LAYOUT.board.tileSize -
      12
    const boardBottom =
      GAME_LAYOUT.board.top +
      GAME_LAYOUT.board.rows * GAME_LAYOUT.board.tileSize +
      (GAME_LAYOUT.board.rows - 1) * GAME_LAYOUT.board.gap -
      12

    return {
      x: this.randomBetween(bounds.left, bounds.right),
      y: this.randomBetween(
        bounds.top,
        Math.min(activeBottom, boardBottom),
      ),
    }
  }

  private randomBetween(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.random()
  }
}
