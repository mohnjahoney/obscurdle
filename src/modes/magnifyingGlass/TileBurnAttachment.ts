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

let nextBurnTextureId = 0

export class TileBurnAttachment {
  private readonly texture: Phaser.Textures.CanvasTexture
  private readonly image: Phaser.GameObjects.Image
  private readonly context: CanvasRenderingContext2D
  private readonly heat: Float32Array
  private lastRedrawAt = -Infinity
  private dirty = false

  constructor(
    private readonly tile: TileView,
    private readonly seed: number,
  ) {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    const gridSize = burn.gridSize
    this.heat = new Float32Array(gridSize * gridSize)
    const textureKey = `obscurdle-burn-${nextBurnTextureId++}`
    const texture = tile.scene.textures.createCanvas(
      textureKey,
      burn.textureSize,
      burn.textureSize,
    )
    if (!texture) {
      throw new Error(`Unable to create burn texture: ${textureKey}`)
    }

    this.texture = texture
    this.context = texture.getContext()
    this.image = tile.scene.add
      .image(0, 0, textureKey)
      .setDisplaySize(
        GAME_LAYOUT.board.tileSize,
        GAME_LAYOUT.board.tileSize,
      )
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
    tile.attachOverlay(this.image, {
      // Phaser's masked reveal does not compose correctly when a preceding
      // child uses MULTIPLY. NORMAL is visually equivalent over transparent
      // pixels and keeps the live burn above both reveal letter layers.
      onRevealStart: () => {
        this.image.setBlendMode(Phaser.BlendModes.NORMAL)
      },
      onRevealComplete: () => {
        this.image.setBlendMode(Phaser.BlendModes.MULTIPLY)
      },
    })
  }

  applyExposure(
    focalPoint: LensPoint,
    deltaSeconds: number,
    nowMs: number,
    heatGainPerSecond: number =
      MAGNIFYING_GLASS_CONFIG.burn.heatGainPerSecond,
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
          gainPerSecond: heatGainPerSecond,
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
    this.tile.detachOverlay(this.image)
    this.image.destroy()
    this.texture.destroy()
  }

  private redraw(): void {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    const tileSize = GAME_LAYOUT.board.tileSize
    const halfTile = tileSize / 2
    const cellSize = tileSize / burn.gridSize
    const rasterScale = burn.textureSize / tileSize
    const mark = burn.mark
    this.context.clearRect(0, 0, burn.textureSize, burn.textureSize)

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
          (cellRandom(this.seed, index, 2) - 0.5) *
            cellSize *
            mark.positionJitter
        const centerY =
          -halfTile +
          (row + 0.5) * cellSize +
          (cellRandom(this.seed, index, 3) - 0.5) *
            cellSize *
            mark.positionJitter
        const radius =
          cellSize *
          Phaser.Math.Linear(
            mark.minimumRadiusInCells,
            mark.maximumRadiusInCells,
            cellRandom(this.seed, index, 4),
          )
        const rasterX = (centerX + halfTile) * rasterScale
        const rasterY = (centerY + halfTile) * rasterScale
        const rasterRadius = radius * rasterScale
        const gradient = this.context.createRadialGradient(
          rasterX,
          rasterY,
          0,
          rasterX,
          rasterY,
          rasterRadius,
        )

        // A translucent center and denser outer band preserve the mottled,
        // ringed marks of the former overlapping vector circles.
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

        this.context.fillStyle = gradient
        this.context.beginPath()
        this.context.arc(
          rasterX,
          rasterY,
          rasterRadius,
          0,
          Math.PI * 2,
        )
        this.context.fill()
      }
    }

    this.texture.refresh()
  }
}
