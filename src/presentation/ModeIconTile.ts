import Phaser from "phaser"
import type { ModeId } from "../modes/ObscuringMode"
import { GAME_STYLE } from "../style/gameStyle"
import { GAME_LAYOUT } from "../style/layout"
import { GAME_MOTION } from "../style/motion"

interface ModeIconTileOptions {
  modeId: ModeId
  onPress(): void
  dark?: boolean
}

const TILE_WIDTH = 85
const TILE_HEIGHT = 60
const TILE_RADIUS = 8

export class ModeIconTile extends Phaser.GameObjects.Container {
  private readonly lightFace: Phaser.GameObjects.Graphics
  private readonly darkFace: Phaser.GameObjects.Graphics
  private readonly lightIcon: Phaser.GameObjects.Graphics
  private readonly darkIcon: Phaser.GameObjects.Graphics
  private paletteMix: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: ModeIconTileOptions,
  ) {
    super(scene, x, y)
    scene.add.existing(this)
    this.paletteMix = options.dark ? 1 : 0
    this.setData("modeId", options.modeId)

    this.lightFace = scene.add.graphics()
    this.darkFace = scene.add.graphics()
    this.drawFace(this.lightFace, false, false)
    this.drawFace(this.darkFace, true, false)
    this.setSize(TILE_WIDTH, TILE_HEIGHT).setInteractive({ useHandCursor: true })

    this.lightIcon = scene.add.graphics()
    this.darkIcon = scene.add.graphics()
    drawModeIcon(this.lightIcon, options.modeId, false)
    drawModeIcon(this.darkIcon, options.modeId, true)

    this.add([this.lightFace, this.darkFace, this.lightIcon, this.darkIcon])
    this.setPaletteMix(this.paletteMix)
    this.on(Phaser.Input.Events.POINTER_DOWN, () => {
      options.onPress()
      scene.tweens.add({
        targets: this,
        scaleX: GAME_STYLE.key.pressedScale,
        scaleY: GAME_STYLE.key.pressedScale,
        duration: GAME_MOTION.key.pressDuration,
        yoyo: true,
      })
    })
    this.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.drawFace(this.lightFace, false, true)
      this.drawFace(this.darkFace, true, true)
    })
    this.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.drawFace(this.lightFace, false, false)
      this.drawFace(this.darkFace, true, false)
    })
  }

  setPaletteMix(mix: number): this {
    this.paletteMix = Phaser.Math.Clamp(mix, 0, 1)
    this.lightFace.setAlpha(1 - this.paletteMix)
    this.lightIcon.setAlpha(1 - this.paletteMix)
    this.darkFace.setAlpha(this.paletteMix)
    this.darkIcon.setAlpha(this.paletteMix)
    return this
  }

  setDark(dark: boolean): this {
    return this.setPaletteMix(dark ? 1 : 0)
  }

  private drawFace(face: Phaser.GameObjects.Graphics, dark: boolean, hovered: boolean): void {
    const fill = dark ? (hovered ? GAME_STYLE.color.mutedInk : GAME_STYLE.color.ink) : GAME_STYLE.color.paperLight
    const stroke = dark ? GAME_STYLE.color.paperLight : hovered ? GAME_STYLE.color.ink : GAME_STYLE.color.rule
    const alpha = dark ? 0.82 : GAME_STYLE.alpha.rule
    face.clear()
    face.fillStyle(fill, 1)
    face.fillRoundedRect(-TILE_WIDTH / 2, -TILE_HEIGHT / 2, TILE_WIDTH, TILE_HEIGHT, TILE_RADIUS)
    face.lineStyle(hovered ? GAME_STYLE.rule.medium : GAME_STYLE.rule.thin, stroke, alpha)
    face.strokeRoundedRect(-TILE_WIDTH / 2, -TILE_HEIGHT / 2, TILE_WIDTH, TILE_HEIGHT, TILE_RADIUS)
  }
}

function drawModeIcon(
  graphics: Phaser.GameObjects.Graphics,
  modeId: ModeId,
  dark = false,
): void {
  const ink = dark ? GAME_STYLE.color.paperLight : GAME_STYLE.color.ink
  const paper = dark ? GAME_STYLE.color.ink : GAME_STYLE.color.paper
  const accent = dark ? GAME_STYLE.color.paperLight : GAME_STYLE.color.present
  graphics.lineStyle(2, ink, 0.9)
  graphics.fillStyle(paper, 1)

  switch (modeId) {
    case "misprint":
      drawSwitchArrow(graphics, ink, 1)
      break
    case "fading-ink":
      drawFadingInkIcon(graphics, ink, dark)
      break
    case "sneaking-tiles":
      drawSneakingTilesIcon(graphics, ink)
      break
    case "magnifying-glass":
      graphics.strokeCircle(-5, -4, 15)
      graphics.strokeLineShape(new Phaser.Geom.Line(6, 7, 25, 25))
      graphics.fillStyle(accent, 0.45)
      graphics.fillCircle(-9, -8, 5)
      break
    case "flashlight":
      graphics.fillStyle(ink, dark ? 0.96 : 0.9)
      graphics.fillRoundedRect(-35, -5.5, 24, 11, 2)
      graphics.fillPoints([
        new Phaser.Math.Vector2(-13, -5),
        new Phaser.Math.Vector2(-1, -11),
        new Phaser.Math.Vector2(-1, 11),
        new Phaser.Math.Vector2(-13, 5),
      ], true)
      graphics.lineStyle(2, ink, 0.95)
      graphics.strokeLineShape(new Phaser.Geom.Line(-13, -5, -1, -9))
      graphics.strokeLineShape(new Phaser.Geom.Line(-1, -9, -1, 9))
      graphics.strokeLineShape(new Phaser.Geom.Line(-1, 9, -13, 5))
      graphics.lineStyle(2, accent, 0.8)
      graphics.strokeLineShape(new Phaser.Geom.Line(-1, -5, 27, -13))
      graphics.strokeLineShape(new Phaser.Geom.Line(-1, 0, 30, 0))
      graphics.strokeLineShape(new Phaser.Geom.Line(-1, 5, 27, 13))
      break
    case "candlelight":
      graphics.fillStyle(accent, 0.35)
      graphics.fillCircle(0, 4, 17)
      graphics.fillStyle(accent, 1)
      graphics.fillTriangle(0, -26, -9, 2, 0, 7)
      graphics.fillTriangle(0, -26, 9, 2, 0, 7)
      graphics.fillStyle(dark ? GAME_STYLE.color.ink : GAME_STYLE.color.paperLight, 1)
      graphics.fillTriangle(0, -12, -4, 0, 0, 4)
      graphics.fillTriangle(0, -12, 4, 0, 0, 4)
      break
    case "plain":
      graphics.strokeRect(-27, -13, 54, 26)
      graphics.lineStyle(1.5, GAME_STYLE.color.mutedInk, 0.7)
      graphics.strokeLineShape(new Phaser.Geom.Line(-18, -5, 18, -5))
      graphics.strokeLineShape(new Phaser.Geom.Line(-18, 3, 18, 3))
      break
  }
}

function drawSwitchArrow(graphics: Phaser.GameObjects.Graphics, color: number, alpha: number): void {
  const upperToLower = [[-28, -12], [-6, -21], [6, 21], [28, 12]] as const
  const lowerToUpper = [[28, -12], [6, -21], [-6, 21], [-28, 12]] as const
  const drawPath = (points: readonly (readonly [number, number])[]): void => {
    graphics.beginPath()
    graphics.moveTo(points[0]![0], points[0]![1])
    for (let i = 1; i <= 16; i += 1) {
      const t = i / 16
      const inverse = 1 - t
      const x = inverse ** 3 * points[0]![0]
        + 3 * inverse ** 2 * t * points[1]![0]
        + 3 * inverse * t ** 2 * points[2]![0]
        + t ** 3 * points[3]![0]
      const y = inverse ** 3 * points[0]![1]
        + 3 * inverse ** 2 * t * points[1]![1]
        + 3 * inverse * t ** 2 * points[2]![1]
        + t ** 3 * points[3]![1]
      graphics.lineTo(x, y)
    }
    graphics.strokePath()
  }

  // A small dark keyline keeps the two switching paths legible where they cross.
  graphics.lineStyle(5, GAME_STYLE.color.ink, 1)
  drawPath(upperToLower)
  drawPath(lowerToUpper)
  graphics.lineStyle(3, color, alpha)
  drawPath(upperToLower)
  drawPath(lowerToUpper)
}

function drawFadingInkIcon(
  graphics: Phaser.GameObjects.Graphics,
  ink: number,
  dark: boolean,
): void {
  const tileXs = [-27, -8, 11]
  const bands = [
    { y: -12, height: 6, alpha: 0.2 },
    { y: -6, height: 6, alpha: 0.42 },
    { y: 0, height: 6, alpha: 0.7 },
    { y: 6, height: 6, alpha: 0.95 },
  ]
  for (const x of tileXs) {
    for (const band of bands) {
      graphics.fillStyle(ink, band.alpha)
      graphics.fillRect(x, band.y, 16, band.height)
      graphics.lineStyle(1, ink, band.alpha)
      graphics.strokeRect(x, band.y, 16, band.height)
    }
  }

  const flecks = [
    { x: -23, y: -16, size: 1.8, alpha: 0.45 },
    { x: -11, y: -18, size: 1.2, alpha: 0.32 },
    { x: 0, y: -15, size: 2.2, alpha: 0.5 },
    { x: 8, y: -19, size: 1.1, alpha: 0.26 },
    { x: 18, y: -16, size: 1.6, alpha: 0.38 },
    { x: 28, y: -20, size: 0.9, alpha: 0.2 },
  ]
  for (const fleck of flecks) {
    graphics.fillStyle(ink, dark ? fleck.alpha : fleck.alpha * 0.85)
    graphics.fillRect(fleck.x, fleck.y, fleck.size, fleck.size)
  }
}

function drawSneakingTilesIcon(
  graphics: Phaser.GameObjects.Graphics,
  ink: number,
): void {
  graphics.lineStyle(1.5, ink, 0.2)
  graphics.strokeRect(0, -15, 20, 20)
  graphics.lineStyle(2, ink, 0.9)
  graphics.strokeRect(-32, -10, 20, 20)
  graphics.strokeRect(-10, -10, 20, 20)
  graphics.strokeRect(12, -10, 20, 20)
}

export function modeTilePosition(index: number): { x: number; y: number } {
  const column = index % 3
  const row = Math.floor(index / 3)
  return {
    x:
      index === 6
        ? GAME_LAYOUT.width / 2
        : GAME_LAYOUT.width / 2 - 133 + column * 133,
    y: GAME_LAYOUT.menu.modeTileStartY + row * GAME_LAYOUT.menu.modeTileRowGap,
  }
}
