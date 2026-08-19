import Phaser from "phaser"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"

function smoothStep(start: number, end: number, value: number): number {
  const amount = Math.min(Math.max((value - start) / (end - start), 0), 1)
  return amount * amount * (3 - 2 * amount)
}

function cellVariation(seed: number, index: number): number {
  const value = Math.sin(seed * 41.7 + index * 127.1) * 43_758.5453
  return 0.82 + (value - Math.floor(value)) * 0.36
}

function cellRandom(seed: number, index: number, channel: number): number {
  const value =
    Math.sin(seed * 53.3 + index * 173.7 + channel * 97.1) *
    24_634.6345
  return value - Math.floor(value)
}

function colorChannel(color: number, shift: number): number {
  return (color >> shift) & 0xff
}

function mixColor(first: number, second: number, amount: number): number {
  const mixChannel = (shift: number) =>
    Math.round(
      Phaser.Math.Linear(
        colorChannel(first, shift),
        colorChannel(second, shift),
        amount,
      ),
    )

  return (mixChannel(16) << 16) | (mixChannel(8) << 8) | mixChannel(0)
}

function colorWithAlpha(color: number, alpha: number): string {
  return `rgba(${colorChannel(color, 16)}, ${colorChannel(
    color,
    8,
  )}, ${colorChannel(color, 0)}, ${Phaser.Math.Clamp(alpha, 0, 1)})`
}

interface BurnTexturePaintOptions {
  context: CanvasRenderingContext2D
  heat: Float32Array
  seed: number
  columns: number
  rows: number
  cellWidth: number
  cellHeight: number
  rasterScale: number
}

export function paintBurnTexture({
  context,
  heat,
  seed,
  columns,
  rows,
  cellWidth,
  cellHeight,
  rasterScale,
}: BurnTexturePaintOptions): void {
  const burn = MAGNIFYING_GLASS_CONFIG.burn
  const mark = burn.mark
  const markScale = (cellWidth + cellHeight) / 2

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column
      const variedHeat = heat[index]! * cellVariation(seed, index)
      if (variedHeat <= burn.brownStartsAt) continue

      const brownAmount = smoothStep(
        burn.brownStartsAt,
        burn.charStartsAt,
        variedHeat,
      )
      const charAmount = smoothStep(
        burn.charStartsAt,
        burn.charFullyDevelopedAt,
        variedHeat,
      )
      const brownColor = mixColor(
        burn.brownColor,
        burn.deepBrownColor,
        brownAmount,
      )
      const color = mixColor(brownColor, burn.charColor, charAmount)
      const alpha =
        Phaser.Math.Linear(
          brownAmount * burn.maximumBrownAlpha,
          burn.maximumCharAlpha,
          charAmount,
        ) *
        (0.78 + cellRandom(seed, index, 1) * 0.22)
      const centerX =
        (column + 0.5) * cellWidth +
        (cellRandom(seed, index, 2) - 0.5) *
          cellWidth *
          mark.positionJitter
      const centerY =
        (row + 0.5) * cellHeight +
        (cellRandom(seed, index, 3) - 0.5) *
          cellHeight *
          mark.positionJitter
      const radius =
        markScale *
        Phaser.Math.Linear(
          mark.minimumRadiusInCells,
          mark.maximumRadiusInCells,
          cellRandom(seed, index, 4),
        )
      const rasterX = centerX * rasterScale
      const rasterY = centerY * rasterScale
      const rasterRadius = radius * rasterScale
      const gradient = context.createRadialGradient(
        rasterX,
        rasterY,
        0,
        rasterX,
        rasterY,
        rasterRadius,
      )

      gradient.addColorStop(
        0,
        colorWithAlpha(color, alpha * mark.centerOpacityRatio),
      )
      gradient.addColorStop(
        0.58,
        colorWithAlpha(color, alpha * mark.middleOpacityRatio),
      )
      gradient.addColorStop(
        mark.darkEdgeStart,
        colorWithAlpha(color, alpha),
      )
      gradient.addColorStop(1, colorWithAlpha(color, 0))

      context.fillStyle = gradient
      context.beginPath()
      context.arc(rasterX, rasterY, rasterRadius, 0, Math.PI * 2)
      context.fill()
    }
  }
}
