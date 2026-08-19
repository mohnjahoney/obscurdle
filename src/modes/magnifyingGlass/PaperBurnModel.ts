import { accumulatedHeat } from "./burnExposure"
import type { LensPoint } from "./LensMotionModel"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"

const surface = MAGNIFYING_GLASS_CONFIG.burn.paperSurface
const width = surface.right - surface.left
const height = surface.bottom - surface.top
const columns = Math.ceil(width / surface.heatCellSize)
const rows = Math.ceil(height / surface.heatCellSize)

export interface PaperBurnPresentationState {
  heat: Float32Array
  version: number
  seed: number
  columns: number
  rows: number
}

export class PaperBurnModel {
  private readonly heat = new Float32Array(columns * rows)
  private version = 0

  presentationState(): PaperBurnPresentationState {
    return {
      heat: this.heat,
      version: this.version,
      seed: surface.seed,
      columns,
      rows,
    }
  }

  applyExposure(
    focalPoint: LensPoint,
    deltaSeconds: number,
    heatGainPerSecond: number,
  ): boolean {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    const focal = MAGNIFYING_GLASS_CONFIG.focalSpot
    const cellWidth = width / columns
    const cellHeight = height / rows
    const reach = focal.radius * 3
    const firstColumn = Math.max(
      0,
      Math.floor((focalPoint.x - reach - surface.left) / cellWidth),
    )
    const lastColumn = Math.min(
      columns - 1,
      Math.ceil((focalPoint.x + reach - surface.left) / cellWidth),
    )
    const firstRow = Math.max(
      0,
      Math.floor((focalPoint.y - reach - surface.top) / cellHeight),
    )
    const lastRow = Math.min(
      rows - 1,
      Math.ceil((focalPoint.y + reach - surface.top) / cellHeight),
    )
    if (firstColumn > lastColumn || firstRow > lastRow) return false

    let changed = false
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const index = row * columns + column
        const cellX = surface.left + (column + 0.5) * cellWidth
        const cellY = surface.top + (row + 0.5) * cellHeight
        const distance = Math.hypot(focalPoint.x - cellX, focalPoint.y - cellY)
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
