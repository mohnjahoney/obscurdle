import Phaser from "phaser"
import { GAME_STYLE, tileFill } from "../../style/gameStyle"
import { GAME_LAYOUT } from "../../style/layout"
import { GAME_MOTION } from "../../style/motion"
import type {
  KeyCapPresentation,
  KeyState,
} from "./KeyboardPresentation"

export class StandardKeyCap implements KeyCapPresentation {
  readonly objects: readonly Phaser.GameObjects.GameObject[]
  readonly hitTarget: Phaser.GameObjects.Rectangle
  private readonly face: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, width: number) {
    this.face = scene.add.rectangle(
      0,
      0,
      width,
      GAME_LAYOUT.keyboard.keyHeight,
      GAME_STYLE.color.key,
    )
    this.face.setStrokeStyle(
      GAME_STYLE.key.borderWidth,
      GAME_STYLE.color.rule,
      GAME_STYLE.alpha.softRule,
    )
    this.face.setInteractive({ useHandCursor: true })
    this.hitTarget = this.face
    this.objects = [this.face]
  }

  applyState(state: KeyState): void {
    const fill = state === "empty" ? GAME_STYLE.color.key : tileFill(state)
    this.face.setFillStyle(fill)
    this.face.setStrokeStyle(
      GAME_STYLE.key.borderWidth,
      state === "empty" ? GAME_STYLE.color.rule : fill,
      state === "empty" ? GAME_STYLE.alpha.softRule : 1,
    )
  }

  animatePress(container: Phaser.GameObjects.Container): void {
    container.scene.tweens.add({
      targets: container,
      scaleX: GAME_STYLE.key.pressedScale,
      scaleY: GAME_STYLE.key.pressedScale,
      duration: GAME_MOTION.key.pressDuration,
      yoyo: true,
    })
  }
}
