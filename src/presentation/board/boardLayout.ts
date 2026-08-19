import { GAME_STYLE } from "../../style/gameStyle"
import { GAME_LAYOUT, boardWidth } from "../../style/layout"
import type { BoardPresentationId } from "./BoardPresentation"

export interface LetterBasePlacement {
  x: number
  y: number
}

export type WrittenTextMeasurer = (text: string) => number

let measurementContext: CanvasRenderingContext2D | null | undefined
const measuredWordPositions = new Map<string, readonly number[]>()

function stableVariation(row: number, column: number, channel: number): number {
  const value =
    Math.sin(row * 127.1 + column * 311.7 + channel * 74.7) * 43_758.5453
  return (value - Math.floor(value)) * 2 - 1
}

function offscreenContext(): CanvasRenderingContext2D | null {
  if (measurementContext !== undefined) return measurementContext
  if (typeof document === "undefined") {
    measurementContext = null
    return measurementContext
  }

  const canvas = document.createElement("canvas")
  canvas.width = GAME_LAYOUT.width
  canvas.height = GAME_STYLE.type.bareLetterSize * 2
  measurementContext = canvas.getContext("2d")
  if (measurementContext) {
    measurementContext.font = `normal ${GAME_STYLE.type.bareLetterSize}px ${GAME_STYLE.type.bareLetterFamily}`
    const contextWithKerning = measurementContext as CanvasRenderingContext2D & {
      fontKerning?: string
    }
    contextWithKerning.fontKerning = "normal"
  }
  return measurementContext
}

function measureOffscreenText(text: string): number {
  const context = offscreenContext()
  if (context) return context.measureText(text).width
  return (
    text.length *
    GAME_STYLE.type.bareLetterSize *
    GAME_STYLE.writtenWord.fallbackGlyphWidthFactor
  )
}

function measureLetterCenters(
  word: string,
  measureText: WrittenTextMeasurer,
): readonly number[] {
  const centers: number[] = []
  for (let index = 0; index < word.length; index += 1) {
    const letter = word[index]!
    const prefixWidth = measureText(word.slice(0, index + 1))
    centers.push(prefixWidth - measureText(letter) / 2)
  }
  return centers
}

function offscreenLetterCenters(word: string): readonly number[] {
  const cached = measuredWordPositions.get(word)
  if (cached) return cached

  const context = offscreenContext()
  if (context) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    context.fillText(word, 0, GAME_STYLE.type.bareLetterSize * 1.5)
  }
  const centers = measureLetterCenters(word, measureOffscreenText)
  measuredWordPositions.set(word, centers)
  return centers
}

export function resolveLetterBasePlacement(
  presentation: BoardPresentationId,
  row: number,
  column: number,
  word: string,
  measureText?: WrittenTextMeasurer,
): LetterBasePlacement {
  const rowStep = GAME_LAYOUT.board.tileSize + GAME_LAYOUT.board.gap
  if (presentation === "tiles") {
    return {
      x:
        (GAME_LAYOUT.width - boardWidth()) / 2 +
        GAME_LAYOUT.board.tileSize / 2 +
        column * rowStep,
      y:
        GAME_LAYOUT.board.top +
        GAME_LAYOUT.board.tileSize / 2 +
        row * rowStep,
    }
  }

  const style = GAME_STYLE.writtenWord
  const tracking =
    style.tracking +
    stableVariation(row, 0, 1) * style.trackingVariationPerRow
  const wordStart =
    style.left + stableVariation(row, 0, 2) * style.startVariationPerRow
  const centers = measureText
    ? measureLetterCenters(word, measureText)
    : offscreenLetterCenters(word)
  const fallbackAdvance =
    GAME_STYLE.type.bareLetterSize * style.fallbackGlyphWidthFactor
  const center =
    centers[column] ??
    (measureText ?? measureOffscreenText)(word) +
      (column - word.length + 0.5) * fallbackAdvance

  return {
    x: wordStart + center + column * tracking,
    y:
      GAME_LAYOUT.board.top +
      GAME_LAYOUT.board.tileSize / 2 +
      row * rowStep +
      stableVariation(row, 0, 3) * style.baselineVariationPerRow +
      stableVariation(row, column, 4) * style.baselineVariationPerLetter,
  }
}
