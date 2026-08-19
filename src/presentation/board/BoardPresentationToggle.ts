import Phaser from "phaser"
import { GAME_STYLE } from "../../style/gameStyle"
import { GAME_LAYOUT } from "../../style/layout"
import { RENDER_SCALE } from "../../style/rendering"
import type { BoardPresentationId } from "./BoardPresentation"

interface ToggleOption {
  id: BoardPresentationId
  label: Phaser.GameObjects.Text
  underline: Phaser.GameObjects.Rectangle
}

export class BoardPresentationToggle extends Phaser.GameObjects.Container {
  private readonly options: ToggleOption[]

  constructor(
    scene: Phaser.Scene,
    selected: BoardPresentationId,
    onChange: (presentationId: BoardPresentationId) => void,
  ) {
    super(scene, GAME_LAYOUT.width / 2, GAME_LAYOUT.boardPresentationToggle.y)
    scene.add.existing(this)

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: GAME_STYLE.type.bodyFamily,
      fontSize: `${GAME_STYLE.type.footerSize}px`,
      color: GAME_STYLE.textColor.faintInk,
      resolution: RENDER_SCALE,
    }
    const boardLabel = scene.add.text(-104, 0, "BOARD", labelStyle).setOrigin(0.5)
    const separator = scene.add.text(8, 0, "·", labelStyle).setOrigin(0.5)

    this.options = [
      this.createOption(scene, -46, "TILES", "tiles", onChange),
      this.createOption(scene, 68, "LETTERS", "bare", onChange),
    ]

    this.add([
      boardLabel,
      separator,
      ...this.options.flatMap((option) => [option.label, option.underline]),
    ])
    this.setSelection(selected)
  }

  setSelection(selected: BoardPresentationId): void {
    for (const option of this.options) {
      const isSelected = option.id === selected
      option.label
        .setColor(
          isSelected
            ? GAME_STYLE.textColor.mutedInk
            : GAME_STYLE.textColor.faintInk,
        )
        .setFontStyle(isSelected ? "bold" : "normal")
      option.underline.setVisible(isSelected)
    }
  }

  private createOption(
    scene: Phaser.Scene,
    x: number,
    text: string,
    id: BoardPresentationId,
    onChange: (presentationId: BoardPresentationId) => void,
  ): ToggleOption {
    const label = scene.add
      .text(x, 0, text, {
        fontFamily: GAME_STYLE.type.bodyFamily,
        fontSize: `${GAME_STYLE.type.footerSize}px`,
        color: GAME_STYLE.textColor.faintInk,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)
    const width = text === "TILES" ? 36 : 48
    const underline = scene.add.rectangle(
      x,
      8,
      width,
      1,
      GAME_STYLE.color.mutedInk,
      GAME_STYLE.alpha.softRule,
    )
    const hitTarget = scene.add
      .zone(x, 0, width + 34, GAME_LAYOUT.boardPresentationToggle.hitHeight)
      .setInteractive({ useHandCursor: true })
    hitTarget.on(Phaser.Input.Events.POINTER_DOWN, () => onChange(id))
    this.add(hitTarget)

    return { id, label, underline }
  }
}
