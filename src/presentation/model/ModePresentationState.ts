import type { CandleBurnState } from "../../modes/candlelight/candleBurn"
import type { CandleSourceSample } from "../../modes/candlelight/candleSource"
import type { FlashlightDistributionId } from "../../modes/flashlight/distributions/registry"
import type { FlashlightUniformValue } from "../../modes/flashlight/FlashlightDistribution"
import type { LensPoint } from "../../modes/magnifyingGlass/LensMotionModel"
import type { TileBurnPresentationState } from "../../modes/magnifyingGlass/TileBurnModel"
import type { PaperBurnPresentationState } from "../../modes/magnifyingGlass/PaperBurnModel"

export interface FadingInkRowPresentationState {
  row: number
  submittedAt: number
  letterStartDelaysMs: readonly number[]
}

export interface FadingInkModePresentationState {
  kind: "fading-ink"
  rows: readonly FadingInkRowPresentationState[]
}

export interface PlainModePresentationState {
  kind: "plain"
}

export interface SneakingTileMotionSegmentState {
  startsAt: number
  durationMs: number
  fromOffsetX: number
  toOffsetX: number
}

export interface SneakingTileMotionPresentationState {
  row: number
  column: number
  segments: readonly SneakingTileMotionSegmentState[]
}

export interface SneakingTilesModePresentationState {
  kind: "sneaking-tiles"
  motions: readonly SneakingTileMotionPresentationState[]
}

export interface MisprintLegibleCellPresentationState {
  row: number
  column: number
}

export interface MisprintModePresentationState {
  kind: "misprint"
  displayWords: readonly { row: number; word: string }[]
  legibleCells: readonly MisprintLegibleCellPresentationState[]
}

export interface FlashlightModePresentationState {
  kind: "flashlight"
  active: boolean
  distribution: FlashlightDistributionId
  target: readonly [number, number]
  uniformOverrides: Readonly<Record<string, FlashlightUniformValue>>
}

export interface CandlelightModePresentationState {
  kind: "candlelight"
  active: boolean
  noiseSeed: number
  burn: CandleBurnState
  source: CandleSourceSample
}

export interface MagnifyingGlassModePresentationState {
  kind: "magnifying-glass"
  active: boolean
  position: LensPoint
  burnRate: number
  automaticMotion: boolean
  burns: readonly TileBurnPresentationState[]
  paperBurn: PaperBurnPresentationState
}

export type ModePresentationState =
  | PlainModePresentationState
  | FadingInkModePresentationState
  | SneakingTilesModePresentationState
  | MisprintModePresentationState
  | FlashlightModePresentationState
  | CandlelightModePresentationState
  | MagnifyingGlassModePresentationState
