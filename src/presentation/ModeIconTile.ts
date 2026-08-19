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
  private readonly face: Phaser.GameObjects.Graphics
  private readonly dark: boolean

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: ModeIconTileOptions,
  ) {
    super(scene, x, y)
    scene.add.existing(this)
    this.dark = options.dark ?? false

    this.face = scene.add.graphics()
    this.drawFace(false)
    this.setSize(TILE_WIDTH, TILE_HEIGHT).setInteractive({ useHandCursor: true })

    const icon = scene.add.graphics()
    drawModeIcon(icon, options.modeId, options.dark ?? false)

    this.add([this.face, icon])
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
      this.drawFace(true)
    })
    this.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.drawFace(false)
    })
  }

  private drawFace(hovered: boolean): void {
    const fill = this.dark ? (hovered ? 0x242424 : 0x111111) : GAME_STYLE.color.paperLight
    const stroke = this.dark ? 0xffffff : hovered ? GAME_STYLE.color.ink : GAME_STYLE.color.rule
    const alpha = this.dark ? 0.82 : GAME_STYLE.alpha.rule
    this.face.clear()
    this.face.fillStyle(fill, 1)
    this.face.fillRoundedRect(-TILE_WIDTH / 2, -TILE_HEIGHT / 2, TILE_WIDTH, TILE_HEIGHT, TILE_RADIUS)
    this.face.lineStyle(hovered ? GAME_STYLE.rule.medium : GAME_STYLE.rule.thin, stroke, alpha)
    this.face.strokeRoundedRect(-TILE_WIDTH / 2, -TILE_HEIGHT / 2, TILE_WIDTH, TILE_HEIGHT, TILE_RADIUS)
  }
}

function drawModeIcon(
  graphics: Phaser.GameObjects.Graphics,
  modeId: ModeId,
  dark = false,
): void {
  const ink = dark ? 0xffffff : GAME_STYLE.color.ink
  const paper = dark ? 0x111111 : GAME_STYLE.color.paper
  const accent = dark ? 0xffffff : GAME_STYLE.color.present
  graphics.lineStyle(2, ink, 0.9)
  graphics.fillStyle(paper, 1)

  switch (modeId) {
    case "misprint":
      graphics.strokeLineShape(new Phaser.Geom.Line(-25, -10, 25, 9))
      graphics.lineStyle(3, dark ? 0xffffff : GAME_STYLE.editorial.strike.color, GAME_STYLE.editorial.strike.alpha)
      graphics.strokeLineShape(new Phaser.Geom.Line(-28, 8, 28, -8))
      break
    case "fading-ink":
      graphics.strokeRect(-27, -13, 18, 24)
      graphics.strokeRect(-3, -13, 18, 24)
      graphics.strokeRect(21, -13, 8, 24)
      graphics.lineStyle(2, dark ? 0xffffff : GAME_STYLE.color.faintInk, dark ? 0.32 : 0.45)
      graphics.strokeRect(-27, -13, 56, 24)
      break
    case "sneaking-tiles":
      graphics.strokeRect(-27, -10, 20, 20)
      graphics.strokeRect(-8, -4, 20, 20)
      graphics.strokeRect(11, -10, 20, 20)
      break
    case "magnifying-glass":
      graphics.strokeCircle(-5, -4, 15)
      graphics.strokeLineShape(new Phaser.Geom.Line(6, 7, 25, 25))
      graphics.fillStyle(accent, 0.45)
      graphics.fillCircle(-9, -8, 5)
      break
    case "flashlight":
      graphics.fillStyle(GAME_STYLE.color.ink, 0.9)
      graphics.fillTriangle(-25, -8, -25, 8, -11, 4)
      graphics.lineStyle(2, accent, 0.8)
      graphics.strokeLineShape(new Phaser.Geom.Line(-8, -5, 27, -13))
      graphics.strokeLineShape(new Phaser.Geom.Line(-8, 0, 30, 0))
      graphics.strokeLineShape(new Phaser.Geom.Line(-8, 5, 27, 13))
      break
    case "candlelight":
      graphics.fillStyle(accent, 0.35)
      graphics.fillCircle(0, 4, 24)
      graphics.fillStyle(accent, 1)
      graphics.fillTriangle(0, -19, -8, -2, 0, 8)
      graphics.fillTriangle(0, -19, 8, -2, 0, 8)
      graphics.fillStyle(dark ? 0x111111 : GAME_STYLE.color.paperLight, 1)
      graphics.fillTriangle(0, -12, -3, -2, 0, 3)
      graphics.fillTriangle(0, -12, 3, -2, 0, 3)
      break
    case "plain":
      graphics.strokeRect(-27, -13, 54, 26)
      graphics.lineStyle(1.5, GAME_STYLE.color.mutedInk, 0.7)
      graphics.strokeLineShape(new Phaser.Geom.Line(-18, -5, 18, -5))
      graphics.strokeLineShape(new Phaser.Geom.Line(-18, 3, 18, 3))
      break
  }
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
