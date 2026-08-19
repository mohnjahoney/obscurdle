import { GAME_LAYOUT } from "../../style/layout"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"

export interface LensPoint {
  x: number
  y: number
}

export type LensMotionPhase =
  | "parked"
  | "waiting"
  | "entering"
  | "roaming"

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
  private phaseValue: LensMotionPhase = "parked"
  private entranceDelayRemainingMs = 0

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

    const entrance = MAGNIFYING_GLASS_CONFIG.motion.entrance
    this.positionValue = { ...entrance.start }
    this.segmentStart = { ...this.positionValue }
    this.segmentTarget = { ...this.positionValue }
  }

  setSubmittedRows(rowCount: number): void {
    const previousRows = this.submittedRows
    this.submittedRows = Math.min(
      Math.max(rowCount, 0),
      GAME_LAYOUT.board.rows,
    )
    if (
      previousRows === 0 &&
      this.submittedRows > 0 &&
      this.phaseValue === "parked"
    ) {
      this.phaseValue = "waiting"
      this.entranceDelayRemainingMs =
        MAGNIFYING_GLASS_CONFIG.motion.entrance
          .delayAfterFirstSubmissionMs
    }
  }

  reposition(position: LensPoint): void {
    this.positionValue = { ...position }
    this.segmentStart = { ...position }
    this.segmentTarget = { ...position }
    this.segmentElapsedMs = 0
    this.segmentDurationMs = 1
    this.pauseRemainingMs = 0
    this.entranceDelayRemainingMs = 0
    this.phaseValue = "roaming"
    this.chooseNextSegment()
  }

  update(deltaMs: number): LensPoint {
    let remainingMs = Math.min(Math.max(deltaMs, 0), 100)

    while (remainingMs > 0) {
      if (this.phaseValue === "parked") break

      if (this.phaseValue === "waiting") {
        const consumed = Math.min(
          remainingMs,
          this.entranceDelayRemainingMs,
        )
        this.entranceDelayRemainingMs -= consumed
        remainingMs -= consumed
        if (this.entranceDelayRemainingMs > 0) break
        this.beginEntrance()
        continue
      }

      if (this.phaseValue === "entering") {
        const segmentRemaining =
          this.segmentDurationMs - this.segmentElapsedMs
        const consumed = Math.min(remainingMs, segmentRemaining)
        this.segmentElapsedMs += consumed
        remainingMs -= consumed
        this.updateSegmentPosition()

        if (this.segmentElapsedMs >= this.segmentDurationMs) {
          this.positionValue = { ...this.segmentTarget }
          this.phaseValue = "roaming"
          this.chooseNextSegment()
        }
        continue
      }

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

      this.updateSegmentPosition()

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

  get phase(): LensMotionPhase {
    return this.phaseValue
  }

  private beginEntrance(): void {
    const entrance = MAGNIFYING_GLASS_CONFIG.motion.entrance
    this.phaseValue = "entering"
    this.segmentStart = { ...this.positionValue }
    this.segmentTarget = { ...entrance.target }
    this.segmentElapsedMs = 0
    this.segmentDurationMs = entrance.durationMs
    this.pauseRemainingMs = 0
  }

  private updateSegmentPosition(): void {
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
