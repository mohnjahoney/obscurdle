import Phaser from "phaser"
import type { LetterCell } from "../../presentation/board/LetterCell"
import type { LensPoint } from "./LensMotionModel"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"

const LENS_MASK_FRAGMENT_SHADER = `
#version 100
#pragma phaserTemplate(shaderName)

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 outTexCoord;

void main() {
  float distanceFromCenter = length(outTexCoord - vec2(0.5));
  float mask = 1.0 - smoothstep(0.455, 0.5, distanceFromCenter);
  gl_FragColor = vec4(vec3(mask), mask);
}
`

let nextLensMaskId = 0

export class LensView {
  private readonly renderTexture?: Phaser.GameObjects.RenderTexture
  private readonly maskShader?: Phaser.GameObjects.Shader
  private readonly frame: Phaser.GameObjects.Container

  constructor(
    scene: Phaser.Scene,
    private readonly sourceTiles: readonly LetterCell[],
    initialPosition: LensPoint,
  ) {
    const lens = MAGNIFYING_GLASS_CONFIG.lens
    const diameter = lens.radius * 2

    if (
      lens.magnificationEnabled &&
      scene.game.renderer.type === Phaser.WEBGL
    ) {
      this.renderTexture = scene.add
        .renderTexture(
          initialPosition.x,
          initialPosition.y,
          diameter,
          diameter,
        )
        .setOrigin(0.5)
        .setDepth(80)
      const maskTextureKey =
        `obscurdle-magnifying-mask-${nextLensMaskId++}`
      this.maskShader = scene.add.shader(
        {
          name: "obscurdleMagnifyingGlassMask",
          fragmentSource: LENS_MASK_FRAGMENT_SHADER,
        },
        diameter / 2,
        diameter / 2,
        diameter,
        diameter,
      )
      this.maskShader
        .setRenderToTexture(maskTextureKey)
        .removeFromDisplayList()
      this.maskShader.renderImmediate()
      this.renderTexture.enableFilters()
      this.renderTexture.filters!.internal.addMask(maskTextureKey)
    }

    const graphics = scene.add.graphics()
    this.drawFrame(graphics)
    this.frame = scene.add
      .container(initialPosition.x, initialPosition.y, [graphics])
      .setDepth(82)

    this.update(initialPosition)
  }

  update(position: LensPoint): void {
    const lens = MAGNIFYING_GLASS_CONFIG.lens
    const diameter = lens.radius * 2
    this.frame.setPosition(position.x, position.y)
    if (!this.renderTexture) return

    this.renderTexture.setPosition(position.x, position.y)
    this.renderTexture.camera
      .setZoom(lens.magnification)
      .setScroll(
        position.x - diameter / (2 * lens.magnification),
        position.y - diameter / (2 * lens.magnification),
      )
    this.renderTexture.clear()
    this.renderTexture.draw(this.sourceTiles)
    this.renderTexture.render()
  }

  destroy(): void {
    this.renderTexture?.destroy()
    this.maskShader?.destroy()
    this.frame.destroy(true)
  }

  private drawFrame(graphics: Phaser.GameObjects.Graphics): void {
    const lens = MAGNIFYING_GLASS_CONFIG.lens
    const focal = MAGNIFYING_GLASS_CONFIG.focalSpot
    const angle = Phaser.Math.DegToRad(lens.handleAngleDegrees)
    const handleStartX = Math.cos(angle) * (lens.radius - 2)
    const handleStartY = Math.sin(angle) * (lens.radius - 2)
    const handleEndX =
      Math.cos(angle) * (lens.radius + lens.handleLength)
    const handleEndY =
      Math.sin(angle) * (lens.radius + lens.handleLength)

    graphics.lineStyle(
      lens.handleWidth + 3,
      lens.shadowColor,
      lens.shadowAlpha,
    )
    graphics.lineBetween(
      handleStartX + 3,
      handleStartY + 4,
      handleEndX + 3,
      handleEndY + 4,
    )
    graphics.lineStyle(lens.handleWidth, lens.rimColor, 1)
    graphics.lineBetween(
      handleStartX,
      handleStartY,
      handleEndX,
      handleEndY,
    )
    graphics.lineStyle(2, lens.rimHighlightColor, 0.68)
    graphics.lineBetween(
      handleStartX - 2,
      handleStartY - 1,
      handleEndX - 2,
      handleEndY - 1,
    )

    graphics.fillStyle(lens.shadowColor, lens.shadowAlpha)
    graphics.fillCircle(3, 4, lens.radius + lens.rimWidth)
    graphics.fillStyle(lens.glassColor, lens.glassAlpha)
    graphics.fillCircle(0, 0, lens.radius - lens.rimWidth / 2)
    graphics.lineStyle(lens.rimWidth, lens.rimColor, 1)
    graphics.strokeCircle(0, 0, lens.radius)
    graphics.lineStyle(1.4, lens.rimHighlightColor, 0.78)
    graphics.strokeCircle(0, 0, lens.radius - lens.rimWidth / 2)

    graphics.lineStyle(2, 0xffffff, 0.36)
    graphics.beginPath()
    graphics.arc(
      0,
      0,
      lens.radius - 9,
      Phaser.Math.DegToRad(205),
      Phaser.Math.DegToRad(285),
      false,
    )
    graphics.strokePath()

    graphics.fillStyle(focal.color, 0.035)
    graphics.fillCircle(0, 0, focal.visualRadius * 1.8)
    graphics.fillStyle(focal.color, 0.08)
    graphics.fillCircle(0, 0, focal.visualRadius)
    graphics.fillStyle(0xfff2c6, 0.42)
    graphics.fillCircle(0, 0, 2.2)
  }
}
