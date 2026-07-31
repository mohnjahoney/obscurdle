import Phaser from "phaser"
import { tileFill } from "../../style/gameStyle"
import { GAME_LAYOUT } from "../../style/layout"
import { VINTAGE_TYPEWRITER_KEYBOARD_STYLE } from "../../style/keyboardStyle"
import type {
  KeyCapPresentation,
  KeyState,
} from "./KeyboardPresentation"

export class VintageTypewriterKeyCap implements KeyCapPresentation {
  readonly objects: readonly Phaser.GameObjects.GameObject[]
  readonly hitTarget: Phaser.GameObjects.Zone
  private readonly drawing: Phaser.GameObjects.Graphics
  private readonly width: number

  constructor(scene: Phaser.Scene, width: number) {
    this.width = width
    this.drawing = scene.add.graphics()
    this.hitTarget = scene.add
      .zone(0, 0, width, GAME_LAYOUT.keyboard.keyHeight)
      .setInteractive({ useHandCursor: true })
    this.objects = [this.drawing, this.hitTarget]
    this.draw("empty")
  }

  applyState(state: KeyState): void {
    this.draw(state)
  }

  private draw(state: KeyState): void {
    const style = VINTAGE_TYPEWRITER_KEYBOARD_STYLE
    const faceColor =
      state === "empty" ? style.color.face : tileFill(state)
    const isFunctionKey = this.width === GAME_LAYOUT.keyboard.wideKeyWidth

    this.drawing.clear()
    if (isFunctionKey) {
      this.drawFunctionKey(faceColor)
    } else {
      this.drawLetterKey(faceColor)
    }
  }

  private drawLetterKey(faceColor: number): void {
    const style = VINTAGE_TYPEWRITER_KEYBOARD_STYLE
    const outerRadius = style.letterKey.outerDiameter / 2
    const innerRadius = style.letterKey.innerRingDiameter / 2
    const faceRadius = style.letterKey.faceDiameter / 2

    this.drawing
      .fillStyle(style.color.shadow, style.alpha.shadow)
      .fillCircle(0, style.shadowOffsetY, outerRadius)
      .fillStyle(style.color.outerRing, 1)
      .fillCircle(0, 0, outerRadius)
      .lineStyle(
        style.ring.outerStrokeWidth,
        style.color.outerStroke,
        style.alpha.outerStroke,
      )
      .strokeCircle(0, 0, outerRadius)
      .fillStyle(style.color.innerRing, 1)
      .fillCircle(0, -0.5, innerRadius)
      .lineStyle(
        style.ring.innerStrokeWidth,
        style.color.innerStroke,
        style.alpha.innerStroke,
      )
      .strokeCircle(0, -0.5, innerRadius)
      .fillStyle(faceColor, 1)
      .fillCircle(0, -1, faceRadius)
      .lineStyle(
        style.ring.faceStrokeWidth,
        style.color.faceStroke,
        style.alpha.faceStroke,
      )
      .strokeCircle(0, -1, faceRadius)
  }

  private drawFunctionKey(faceColor: number): void {
    const style = VINTAGE_TYPEWRITER_KEYBOARD_STYLE
    const outerWidth = this.width
    const outerHeight = style.functionKey.outerHeight
    const innerInset = style.functionKey.innerInset
    const faceInset = style.functionKey.faceInset

    this.drawing
      .fillStyle(style.color.shadow, style.alpha.shadow)
      .fillRoundedRect(
        -outerWidth / 2,
        -outerHeight / 2 + style.shadowOffsetY,
        outerWidth,
        outerHeight,
        outerHeight / 2,
      )
      .fillStyle(style.color.outerRing, 1)
      .fillRoundedRect(
        -outerWidth / 2,
        -outerHeight / 2,
        outerWidth,
        outerHeight,
        outerHeight / 2,
      )
      .lineStyle(
        style.ring.outerStrokeWidth,
        style.color.outerStroke,
        style.alpha.outerStroke,
      )
      .strokeRoundedRect(
        -outerWidth / 2,
        -outerHeight / 2,
        outerWidth,
        outerHeight,
        outerHeight / 2,
      )
      .fillStyle(style.color.innerRing, 1)
      .fillRoundedRect(
        -outerWidth / 2 + innerInset,
        -outerHeight / 2 + innerInset - 0.5,
        outerWidth - innerInset * 2,
        outerHeight - innerInset * 2,
        (outerHeight - innerInset * 2) / 2,
      )
      .fillStyle(faceColor, 1)
      .fillRoundedRect(
        -outerWidth / 2 + faceInset,
        -outerHeight / 2 + faceInset - 1,
        outerWidth - faceInset * 2,
        outerHeight - faceInset * 2,
        (outerHeight - faceInset * 2) / 2,
      )
      .lineStyle(
        style.ring.faceStrokeWidth,
        style.color.faceStroke,
        style.alpha.faceStroke,
      )
      .strokeRoundedRect(
        -outerWidth / 2 + faceInset,
        -outerHeight / 2 + faceInset - 1,
        outerWidth - faceInset * 2,
        outerHeight - faceInset * 2,
        (outerHeight - faceInset * 2) / 2,
      )
  }
}
