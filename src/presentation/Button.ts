import Phaser from "phaser"
import { GAME_STYLE } from "../style/gameStyle"
import { GAME_LAYOUT } from "../style/layout"
import { GAME_MOTION } from "../style/motion"
import { RENDER_SCALE } from "../style/rendering"

export class Button extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Rectangle

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onPress: () => void,
    options: { inverted?: boolean; compact?: boolean } = {},
  ) {
    super(scene, x, y)
    scene.add.existing(this)

    const width = options.compact
      ? GAME_LAYOUT.button.width * 0.9
      : GAME_LAYOUT.button.width
    const height = options.compact
      ? GAME_LAYOUT.button.height * 0.78
      : GAME_LAYOUT.button.height
    const fill = options.inverted ? GAME_STYLE.color.ink : GAME_STYLE.color.paperLight
    const ink = options.inverted
      ? GAME_STYLE.textColor.paperLight
      : GAME_STYLE.textColor.ink

    this.face = scene.add.rectangle(0, 0, width, height, fill)
    this.face.setStrokeStyle(
      GAME_STYLE.dialog.borderWidth,
      GAME_STYLE.color.ink,
      GAME_STYLE.alpha.rule,
    )
    this.face.setInteractive({ useHandCursor: true })

    const text = scene.add
      .text(0, 1, label, {
        fontFamily: GAME_STYLE.type.bodyFamily,
        fontSize: `${GAME_STYLE.type.buttonSize}px`,
        fontStyle: "bold",
        color: ink,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)

    this.add([this.face, text])
    this.face.on(Phaser.Input.Events.POINTER_DOWN, () => {
      onPress()
      this.scene.tweens.add({
        targets: this,
        scaleX: GAME_STYLE.key.pressedScale,
        scaleY: GAME_STYLE.key.pressedScale,
        duration: GAME_MOTION.key.pressDuration,
        yoyo: true,
      })
    })
  }
}
