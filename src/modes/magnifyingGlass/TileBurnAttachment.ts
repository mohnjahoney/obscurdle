import Phaser from "phaser"
import type { TileView } from "../../presentation/TileView"
import { GAME_LAYOUT } from "../../style/layout"
import { accumulatedHeat } from "./burnExposure"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"
import type { LensPoint } from "./LensMotionModel"

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
    Math.sin(
      seed * 53.3 +
        index * 173.7 +
        channel * 97.1,
    ) * 24_634.6345
  return value - Math.floor(value)
}

function mixColor(first: number, second: number, amount: number): number {
  const firstColor = Phaser.Display.Color.IntegerToColor(first)
  const secondColor = Phaser.Display.Color.IntegerToColor(second)
  return Phaser.Display.Color.GetColor(
    Phaser.Math.Linear(firstColor.red, secondColor.red, amount),
    Phaser.Math.Linear(firstColor.green, secondColor.green, amount),
    Phaser.Math.Linear(firstColor.blue, secondColor.blue, amount),
  )
}

export class TileBurnAttachment {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly heat: Float32Array
  private lastRedrawAt = -Infinity
  private dirty = false

  constructor(
    private readonly tile: TileView,
    private readonly seed: number,
  ) {
    const gridSize = MAGNIFYING_GLASS_CONFIG.burn.gridSize
    this.heat = new Float32Array(gridSize * gridSize)
    this.graphics = tile.scene.add.graphics()
    this.graphics.setBlendMode(Phaser.BlendModes.MULTIPLY)
    tile.add(this.graphics)
  }

  applyExposure(
    focalPoint: LensPoint,
    deltaSeconds: number,
    nowMs: number,
  ): void {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    const focal = MAGNIFYING_GLASS_CONFIG.focalSpot
    const tileSize = GAME_LAYOUT.board.tileSize
    const halfTile = tileSize / 2
    const centerDistance = Math.hypot(
      focalPoint.x - this.tile.x,
      focalPoint.y - this.tile.y,
    )
    if (centerDistance > halfTile * Math.SQRT2 + focal.radius * 3) {
      return
    }

    const cellSize = tileSize / burn.gridSize
    for (let row = 0; row < burn.gridSize; row += 1) {
      for (let column = 0; column < burn.gridSize; column += 1) {
        const index = row * burn.gridSize + column
        const cellX =
          this.tile.x - halfTile + (column + 0.5) * cellSize
        const cellY =
          this.tile.y - halfTile + (row + 0.5) * cellSize
        const distance = Math.hypot(
          focalPoint.x - cellX,
          focalPoint.y - cellY,
        )
        const previous = this.heat[index]!
        const next = accumulatedHeat(previous, distance, deltaSeconds, {
          radius: focal.radius,
          intensity: focal.intensity,
          gainPerSecond: burn.heatGainPerSecond,
          maximumHeat: burn.maximumHeat,
        })
        if (next > previous + 0.0001) {
          this.heat[index] = next
          this.dirty = true
        }
      }
    }

    if (this.dirty && nowMs - this.lastRedrawAt >= burn.redrawIntervalMs) {
      this.redraw()
      this.lastRedrawAt = nowMs
      this.dirty = false
    }
  }

  destroy(): void {
    this.graphics.destroy()
  }

  private redraw(): void {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    const tileSize = GAME_LAYOUT.board.tileSize
    const halfTile = tileSize / 2
    const cellSize = tileSize / burn.gridSize
    this.graphics.clear()

    for (let row = 0; row < burn.gridSize; row += 1) {
      for (let column = 0; column < burn.gridSize; column += 1) {
        const index = row * burn.gridSize + column
        const variedHeat =
          this.heat[index]! * cellVariation(this.seed, index)
        if (variedHeat <= burn.brownStartsAt) continue

        const brownAmount = smoothStep(
          burn.brownStartsAt,
          burn.charStartsAt,
          variedHeat,
        )
        const charAmount = smoothStep(
          burn.charStartsAt,
          burn.maximumHeat,
          variedHeat,
        )
        const brownColor = mixColor(
          burn.brownColor,
          burn.deepBrownColor,
          brownAmount,
        )
        const color = mixColor(
          brownColor,
          burn.charColor,
          charAmount,
        )
        const alpha = Phaser.Math.Linear(
          brownAmount * burn.maximumBrownAlpha,
          burn.maximumCharAlpha,
          charAmount,
        ) * (0.78 + cellRandom(this.seed, index, 1) * 0.22)
        const centerX =
          -halfTile +
          (column + 0.5) * cellSize +
          (cellRandom(this.seed, index, 2) - 0.5) * cellSize * 0.42
        const centerY =
          -halfTile +
          (row + 0.5) * cellSize +
          (cellRandom(this.seed, index, 3) - 0.5) * cellSize * 0.42
        const radius =
          cellSize *
          (0.58 + cellRandom(this.seed, index, 4) * 0.34)
        this.graphics.fillStyle(color, alpha)
        this.graphics.fillCircle(centerX, centerY, radius)
      }
    }
  }
}
