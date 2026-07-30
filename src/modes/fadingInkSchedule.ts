import { FADING_INK_CONFIG } from "./fadingInkConfig"

export interface RowFadeSchedule {
  submittedAt: number
  letterStartDelaysMs: number[]
}

type RandomSource = () => number

export function createRowFadeSchedule(
  submittedAt: number,
  letterCount: number,
  random: RandomSource = Math.random,
): RowFadeSchedule {
  return {
    submittedAt,
    letterStartDelaysMs: Array.from(
      { length: letterCount },
      () => random() * FADING_INK_CONFIG.letterStartJitterMaxMs,
    ),
  }
}

export function letterInkAlphaAt(
  schedule: RowFadeSchedule,
  column: number,
  now: number,
): number {
  const startDelay = schedule.letterStartDelaysMs[column]
  if (startDelay === undefined) return 1

  const fadeElapsed =
    now -
    schedule.submittedAt -
    FADING_INK_CONFIG.gracePeriodMs -
    startDelay

  if (fadeElapsed <= 0) return 1
  if (fadeElapsed >= FADING_INK_CONFIG.fadeDurationMs) return 0

  return 1 - fadeElapsed / FADING_INK_CONFIG.fadeDurationMs
}

export function rowFadeStartsAt(schedule: RowFadeSchedule): number {
  const firstLetterDelay =
    schedule.letterStartDelaysMs.length > 0
      ? Math.min(...schedule.letterStartDelaysMs)
      : 0

  return (
    schedule.submittedAt +
    FADING_INK_CONFIG.gracePeriodMs +
    firstLetterDelay
  )
}
