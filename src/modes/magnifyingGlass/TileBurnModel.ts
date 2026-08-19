import type { LetterBasePlacement } from "../../presentation/board/boardLayout"
import { GAME_LAYOUT } from "../../style/layout"
import { accumulatedHeat } from "./burnExposure"
import type { LensPoint } from "./LensMotionModel"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"

export interface TileBurnPresentationState {
  row: number
  column: number
  seed: number
  heat: Float32Array
  version: number
}

export class TileBurnModel {
  private readonly heat = new Float32Array(
    MAGNIFYING_GLASS_CONFIG.burn.gridSize ** 2,
  )
  private version = 0

  constructor(
    readonly row: number,
    readonly column: number,
    readonly seed: number,
  ) {}

  presentationState(): TileBurnPresentationState {
    return {
      row: this.row,
      column: this.column,
      seed: this.seed,
      heat: this.heat,
      version: this.version,
    }
  }

  applyExposure(
    focalPoint: LensPoint,
    basePlacement: LetterBasePlacement,
    deltaSeconds: number,
    heatGainPerSecond: number,
  ): boolean {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    const focal = MAGNIFYING_GLASS_CONFIG.focalSpot
    const tileSize = GAME_LAYOUT.board.tileSize
    const halfTile = tileSize / 2
    const tileX = basePlacement.x
    const tileY = basePlacement.y
    const centerDistance = Math.hypot(
      focalPoint.x - tileX,
      focalPoint.y - tileY,
    )
    if (centerDistance > halfTile * Math.SQRT2 + focal.radius * 3) {
      return false
    }

    let changed = false
    const cellSize = tileSize / burn.gridSize
    for (let row = 0; row < burn.gridSize; row += 1) {
      for (let column = 0; column < burn.gridSize; column += 1) {
        const index = row * burn.gridSize + column
        const cellX = tileX - halfTile + (column + 0.5) * cellSize
        const cellY = tileY - halfTile + (row + 0.5) * cellSize
        const distance = Math.hypot(
          focalPoint.x - cellX,
          focalPoint.y - cellY,
        )
        const previous = this.heat[index]!
        const next = accumulatedHeat(previous, distance, deltaSeconds, {
          radius: focal.radius,
          intensity: focal.intensity,
          gainPerSecond: heatGainPerSecond,
          maximumHeat: burn.maximumHeat,
        })
        if (next > previous + 0.0001) {
          this.heat[index] = next
          changed = true
        }
      }
    }

    if (changed) this.version += 1
    return changed
  }
}
