import type { FadingInkModePresentationState } from "../presentation/model/ModePresentationState"
import { GAME_LAYOUT } from "../style/layout"
import type { ModeContext, ObscuringMode } from "./ObscuringMode"
import { FADING_INK_CONFIG } from "./fadingInkConfig"
import {
  createRowFadeSchedule,
  rowFadeStartsAt,
  type RowFadeSchedule,
} from "./fadingInkSchedule"

export class FadingInkMode implements ObscuringMode {
  private readonly schedules = new Map<number, RowFadeSchedule>()
  private readonly completedRows = new Set<number>()

  start(): void {
    this.schedules.clear()
    this.completedRows.clear()
  }

  presentationState(): FadingInkModePresentationState {
    return {
      kind: "fading-ink",
      rows: Array.from(this.schedules, ([row, schedule]) => ({
        row,
        submittedAt: schedule.submittedAt,
        letterStartDelaysMs: [...schedule.letterStartDelaysMs],
      })),
    }
  }

  onGuessSubmitted(context: ModeContext, row: number): void {
    const schedule = createRowFadeSchedule(
      context.scene.time.now,
      GAME_LAYOUT.board.columns,
    )
    this.schedules.set(row, schedule)
    this.completedRows.delete(row)
  }

  update(context: ModeContext): boolean {
    const now = context.scene.time.now
    let hasActiveFade = false
    let reachedCompletion = false

    for (const [row, schedule] of this.schedules) {
      const fadeStartsAt = rowFadeStartsAt(schedule)
      const lastLetterDelay = Math.max(...schedule.letterStartDelaysMs, 0)
      const fadeCompletesAt =
        schedule.submittedAt +
        FADING_INK_CONFIG.gracePeriodMs +
        lastLetterDelay +
        FADING_INK_CONFIG.fadeDurationMs

      if (now >= fadeStartsAt && now <= fadeCompletesAt) {
        hasActiveFade = true
      } else if (now > fadeCompletesAt && !this.completedRows.has(row)) {
        this.completedRows.add(row)
        reachedCompletion = true
      }
    }

    return hasActiveFade || reachedCompletion
  }

  stop(): void {
    this.schedules.clear()
    this.completedRows.clear()
  }
}
