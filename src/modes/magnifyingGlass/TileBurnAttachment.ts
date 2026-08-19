import Phaser from "phaser"
import type { LetterCell } from "../../presentation/board/LetterCell"
import { GAME_LAYOUT } from "../../style/layout"
import { paintBurnTexture } from "./burnTexturePainter"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"
import { paintPaperAperture } from "./paperAperturePainter"
import type { TileBurnPresentationState } from "./TileBurnModel"

let nextBurnTextureId = 0

export class TileBurnAttachment {
  private readonly scorchTexture: Phaser.Textures.CanvasTexture
  private readonly scorchImage: Phaser.GameObjects.Image
  private readonly scorchContext: CanvasRenderingContext2D
  private readonly apertureTexture: Phaser.Textures.CanvasTexture
  private readonly apertureImage: Phaser.GameObjects.Image
  private readonly apertureContext: CanvasRenderingContext2D
  private renderedVersion = 0
  private lastRedrawAt = -Infinity

  constructor(
    private readonly tile: LetterCell,
    private readonly seed: number,
  ) {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    const textureId = nextBurnTextureId++
    const scorchTextureKey = `obscurdle-burn-${textureId}`
    const scorchTexture = tile.scene.textures.createCanvas(
      scorchTextureKey,
      burn.textureSize,
      burn.textureSize,
    )
    if (!scorchTexture) {
      throw new Error(`Unable to create burn texture: ${scorchTextureKey}`)
    }
    const apertureTextureKey = `obscurdle-burn-aperture-${textureId}`
    const apertureTexture = tile.scene.textures.createCanvas(
      apertureTextureKey,
      burn.textureSize,
      burn.textureSize,
    )
    if (!apertureTexture) {
      scorchTexture.destroy()
      throw new Error(
        `Unable to create burn aperture texture: ${apertureTextureKey}`,
      )
    }

    this.scorchTexture = scorchTexture
    this.scorchContext = scorchTexture.getContext()
    this.scorchImage = tile.scene.add
      .image(0, 0, scorchTextureKey)
      .setDisplaySize(
        GAME_LAYOUT.board.tileSize,
        GAME_LAYOUT.board.tileSize,
      )
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
    this.apertureTexture = apertureTexture
    this.apertureContext = apertureTexture.getContext()
    this.apertureImage = tile.scene.add
      .image(0, 0, apertureTextureKey)
      .setDisplaySize(
        GAME_LAYOUT.board.tileSize,
        GAME_LAYOUT.board.tileSize,
      )
      .setBlendMode(Phaser.BlendModes.NORMAL)

    tile.attachOverlay(this.scorchImage, {
      // Phaser's masked reveal does not compose correctly when a preceding
      // child uses MULTIPLY. NORMAL is visually equivalent over transparent
      // pixels and keeps the live burn above both reveal letter layers.
      onRevealStart: () => {
        this.scorchImage.setBlendMode(Phaser.BlendModes.NORMAL)
      },
      onRevealComplete: () => {
        this.scorchImage.setBlendMode(Phaser.BlendModes.MULTIPLY)
      },
    })
    // The aperture is a material replacement, not a tint. NORMAL blending
    // keeps its black opening and dimensional rim above every letter layer.
    tile.attachOverlay(this.apertureImage)
  }

  apply(state: TileBurnPresentationState, nowMs: number): void {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    if (
      state.version === this.renderedVersion ||
      nowMs - this.lastRedrawAt < burn.redrawIntervalMs
    ) return

    this.redraw(state.heat)
    this.renderedVersion = state.version
    this.lastRedrawAt = nowMs
  }

  destroy(): void {
    this.tile.detachOverlay(this.scorchImage)
    this.tile.detachOverlay(this.apertureImage)
    this.scorchImage.destroy()
    this.apertureImage.destroy()
    this.scorchTexture.destroy()
    this.apertureTexture.destroy()
  }

  private redraw(heat: Float32Array): void {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    const tileSize = GAME_LAYOUT.board.tileSize
    const cellSize = tileSize / burn.gridSize
    const rasterScale = burn.textureSize / tileSize
    this.scorchContext.clearRect(0, 0, burn.textureSize, burn.textureSize)
    paintBurnTexture({
      context: this.scorchContext,
      heat,
      seed: this.seed,
      columns: burn.gridSize,
      rows: burn.gridSize,
      cellWidth: cellSize,
      cellHeight: cellSize,
      rasterScale,
    })
    this.apertureContext.clearRect(
      0,
      0,
      burn.textureSize,
      burn.textureSize,
    )
    paintPaperAperture({
      context: this.apertureContext,
      heat,
      seed: this.seed,
      columns: burn.gridSize,
      rows: burn.gridSize,
      cellWidth: cellSize,
      cellHeight: cellSize,
      rasterScale,
    })

    this.scorchTexture.refresh()
    this.apertureTexture.refresh()
  }
}
