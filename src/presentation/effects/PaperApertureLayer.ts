import Phaser from "phaser"
import { MAGNIFYING_GLASS_CONFIG } from "../../modes/magnifyingGlass/magnifyingGlassConfig"
import { paintPaperAperture } from "../../modes/magnifyingGlass/paperAperturePainter"
import type { PaperBurnPresentationState } from "../../modes/magnifyingGlass/PaperBurnModel"

let nextPaperApertureTextureId = 0

export class PaperApertureLayer {
  private readonly texture: Phaser.Textures.CanvasTexture
  private readonly image: Phaser.GameObjects.Image
  private readonly context: CanvasRenderingContext2D
  private renderedVersion = -1
  private lastRedrawAt = -Infinity

  constructor(scene: Phaser.Scene) {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    const surface = burn.paperSurface
    const width = surface.right - surface.left
    const height = surface.bottom - surface.top
    const textureKey =
      `obscurdle-paper-aperture-${nextPaperApertureTextureId++}`
    const texture = scene.textures.createCanvas(
      textureKey,
      Math.ceil(width * surface.textureScale),
      Math.ceil(height * surface.textureScale),
    )
    if (!texture) {
      throw new Error(`Unable to create paper aperture texture: ${textureKey}`)
    }

    this.texture = texture
    this.context = texture.getContext()
    this.image = scene.add
      .image(
        (surface.left + surface.right) / 2,
        (surface.top + surface.bottom) / 2,
        textureKey,
      )
      .setDisplaySize(width, height)
      .setDepth(burn.aperture.depth)
      .setBlendMode(Phaser.BlendModes.NORMAL)
  }

  apply(state: PaperBurnPresentationState, nowMs: number): void {
    const burn = MAGNIFYING_GLASS_CONFIG.burn
    if (
      state.version === this.renderedVersion ||
      nowMs - this.lastRedrawAt < burn.redrawIntervalMs
    ) return

    const surface = burn.paperSurface
    const width = surface.right - surface.left
    const height = surface.bottom - surface.top
    this.context.clearRect(0, 0, this.texture.width, this.texture.height)
    paintPaperAperture({
      context: this.context,
      heat: state.heat,
      seed: state.seed,
      columns: state.columns,
      rows: state.rows,
      cellWidth: width / state.columns,
      cellHeight: height / state.rows,
      rasterScale: surface.textureScale,
    })
    this.texture.refresh()
    this.renderedVersion = state.version
    this.lastRedrawAt = nowMs
  }

  destroy(): void {
    this.image.destroy()
    this.texture.destroy()
  }
}
