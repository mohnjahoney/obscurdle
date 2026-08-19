import type {
  SneakingTileMotionPresentationState,
  SneakingTileMotionSegmentState,
} from "../../presentation/model/ModePresentationState"
import { GAME_LAYOUT, boardWidth } from "../../style/layout"
import { GAME_MOTION } from "../../style/motion"
import { SNEAKING_TILES_CONFIG } from "./sneakingTilesConfig"

type RandomSource = () => number

function randomBetween(
  minimum: number,
  maximum: number,
  random: RandomSource,
): number {
  return minimum + random() * (maximum - minimum)
}

function tileCenterX(column: number): number {
  const firstCenter =
    (GAME_LAYOUT.width - boardWidth()) / 2 + GAME_LAYOUT.board.tileSize / 2
  return (
    firstCenter +
    column * (GAME_LAYOUT.board.tileSize + GAME_LAYOUT.board.gap)
  )
}

export function createSneakingTileMotion(
  row: number,
  column: number,
  submittedAt: number,
  random: RandomSource = Math.random,
): SneakingTileMotionPresentationState {
  const originX = tileCenterX(column)
  const escapeLeft =
    originX < GAME_LAYOUT.width / 2 ||
    (originX === GAME_LAYOUT.width / 2 && random() < 0.5)
  const destinationX = escapeLeft
    ? -SNEAKING_TILES_CONFIG.offscreenMargin
    : GAME_LAYOUT.width + SNEAKING_TILES_CONFIG.offscreenMargin
  const destinationOffsetX = destinationX - originX
  const direction = Math.sign(destinationOffsetX)
  const revealFinishesAfter =
    GAME_MOTION.tile.inkBloom.duration +
    column * GAME_MOTION.tile.revealStagger
  let cursor =
    submittedAt +
    revealFinishesAfter +
    randomBetween(
      SNEAKING_TILES_CONFIG.hesitationMs.minimum,
      SNEAKING_TILES_CONFIG.hesitationMs.maximum,
      random,
    )
  let offsetX = 0
  const segments: SneakingTileMotionSegmentState[] = []

  while (Math.abs(destinationOffsetX - offsetX) >= 0.5) {
    const remaining = Math.abs(destinationOffsetX - offsetX)
    const distance = Math.min(
      remaining,
      randomBetween(
        SNEAKING_TILES_CONFIG.creep.minimumDistance,
        SNEAKING_TILES_CONFIG.creep.maximumDistance,
        random,
      ),
    )
    const durationMs = randomBetween(
      SNEAKING_TILES_CONFIG.creep.minimumDurationMs,
      SNEAKING_TILES_CONFIG.creep.maximumDurationMs,
      random,
    )
    const nextOffsetX = offsetX + direction * distance

    segments.push({
      startsAt: cursor,
      durationMs,
      fromOffsetX: offsetX,
      toOffsetX: nextOffsetX,
    })
    offsetX = nextOffsetX
    cursor += durationMs

    if (Math.abs(destinationOffsetX - offsetX) >= 0.5) {
      cursor += randomBetween(
        SNEAKING_TILES_CONFIG.pauseMs.minimum,
        SNEAKING_TILES_CONFIG.pauseMs.maximum,
        random,
      )
    }
  }

  return { row, column, segments }
}

export interface SneakingTileMotionSample {
  offsetX: number
  depthOffset: number
}

export function sampleSneakingTileMotion(
  motion: SneakingTileMotionPresentationState,
  now: number,
): SneakingTileMotionSample {
  const firstSegment = motion.segments[0]
  if (!firstSegment || now < firstSegment.startsAt) {
    return { offsetX: 0, depthOffset: 0 }
  }

  let offsetX = 0
  for (const segment of motion.segments) {
    if (now < segment.startsAt) break

    const progress = Math.min(
      Math.max((now - segment.startsAt) / segment.durationMs, 0),
      1,
    )
    if (progress < 1) {
      const easedProgress = (1 - Math.cos(Math.PI * progress)) / 2
      return {
        offsetX:
          segment.fromOffsetX +
          (segment.toOffsetX - segment.fromOffsetX) * easedProgress,
        depthOffset: -1,
      }
    }
    offsetX = segment.toOffsetX
  }

  return { offsetX, depthOffset: -1 }
}

export function sneakingMotionChangesBetween(
  motion: SneakingTileMotionPresentationState,
  previousNow: number,
  now: number,
): boolean {
  return motion.segments.some((segment) => {
    const endsAt = segment.startsAt + segment.durationMs
    const isActive = now >= segment.startsAt && now <= endsAt
    const crossedStart =
      previousNow < segment.startsAt && now >= segment.startsAt
    const crossedEnd = previousNow < endsAt && now >= endsAt
    return isActive || crossedStart || crossedEnd
  })
}
