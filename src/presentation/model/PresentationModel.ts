import type { LetterResult } from "../../core/evaluateGuess"
import type { CandleBurnState } from "../../modes/candlelight/candleBurn"
import type { CandleSourceSample } from "../../modes/candlelight/candleSource"
import type { FlashlightDistributionId } from "../../modes/flashlight/distributions/registry"
import type { FlashlightUniformValue } from "../../modes/flashlight/FlashlightDistribution"
import type { LensPoint } from "../../modes/magnifyingGlass/LensMotionModel"
import type { TileBurnPresentationState } from "../../modes/magnifyingGlass/TileBurnModel"
import type { PaperBurnPresentationState } from "../../modes/magnifyingGlass/PaperBurnModel"
import type { KeyboardPresentationId } from "../keyboard/KeyboardPresentation"
import type { BoardPresentationId } from "../board/BoardPresentation"

export interface PagePresentationModel {
  kind: "paper"
}

export interface MastheadPresentationModel {
  title: string
  deck: string
}

export interface LetterCellPresentationModel {
  letter: string
  baseX: number
  baseY: number
  evaluation?: LetterResult
  inkAlpha?: number
  offsetX?: number
  depthOffset?: number
  letterLegibleProgress?: number
  reportLetterLegible?: boolean
}

export interface FadeStartMarkerPresentationModel {
  row: number
  visible: boolean
  x: number
  y: number
}

export interface BoardPresentationModel {
  kind: BoardPresentationId
  rows: readonly (readonly LetterCellPresentationModel[])[]
  fadeStartMarkers: readonly FadeStartMarkerPresentationModel[]
}

export interface KeyboardPresentationModel {
  kind: KeyboardPresentationId
  evaluations: Readonly<Partial<Record<string, LetterResult>>>
}

export interface FooterPresentationModel {
  text: string
}

export interface NoSceneEffectPresentationModel {
  kind: "none"
}

export interface FlashlightEffectPresentationModel {
  kind: "flashlight"
  distribution: FlashlightDistributionId
  target: readonly [number, number]
  timeSeconds: number
  uniformOverrides: Readonly<Record<string, FlashlightUniformValue>>
}

export interface CandlelightEffectPresentationModel {
  kind: "candlelight"
  noiseSeed: number
  timeSeconds: number
  burn: CandleBurnState
  source: CandleSourceSample
}

export interface MagnifyingGlassEffectPresentationModel {
  kind: "magnifying-glass"
  position: LensPoint
  burnRate: number
  automaticMotion: boolean
  burns: readonly TileBurnPresentationState[]
  paperBurn: PaperBurnPresentationState
  timeMs: number
}

export type SceneEffectPresentationModel =
  | NoSceneEffectPresentationModel
  | FlashlightEffectPresentationModel
  | CandlelightEffectPresentationModel
  | MagnifyingGlassEffectPresentationModel

export interface PresentationModel {
  page: PagePresentationModel
  masthead: MastheadPresentationModel
  board: BoardPresentationModel
  keyboard: KeyboardPresentationModel
  footer: FooterPresentationModel
  effect: SceneEffectPresentationModel
}
