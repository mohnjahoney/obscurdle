import Phaser from "phaser"
import { GAME_STYLE } from "../../style/gameStyle"
import { GAME_LAYOUT } from "../../style/layout"
import { RENDER_SCALE } from "../../style/rendering"
import type { KeyboardPresentationId } from "./KeyboardPresentation"

type OptionId = KeyboardPresentationId

interface ToggleOption {
  id: OptionId
  label: Phaser.GameObjects.Text
  underline: Phaser.GameObjects.Rectangle
}

export class KeyboardPresentationToggle extends Phaser.GameObjects.Container {
  private readonly options: ToggleOption[]

  constructor(
    scene: Phaser.Scene,
    selected: KeyboardPresentationId,
    onChange: (presentationId: KeyboardPresentationId) => void,
  ) {
    super(
      scene,
      GAME_LAYOUT.width / 2,
      GAME_LAYOUT.keyboardPresentationToggle.y,
    )
    scene.add.existing(this)

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: GAME_STYLE.type.bodyFamily,
      fontSize: `${GAME_STYLE.type.footerSize}px`,
      color: GAME_STYLE.textColor.faintInk,
      resolution: RENDER_SCALE,
    }
    const keysLabel = scene.add.text(-104, 0, "KEYS", labelStyle).setOrigin(0.5)
    const separator = scene.add.text(13, 0, "·", labelStyle).setOrigin(0.5)

    this.options = [
      this.createOption(scene, -47, "DIGITAL", "digital", onChange),
      this.createOption(
        scene,
        72,
        "TYPEWRITER",
        "vintage-typewriter",
        onChange,
      ),
    ]

    this.add([
      keysLabel,
      separator,
      ...this.options.flatMap((option) => [option.label, option.underline]),
    ])
    this.setSelection(selected)
  }

  setSelection(selected: KeyboardPresentationId): void {
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
    id: OptionId,
    onChange: (presentationId: KeyboardPresentationId) => void,
  ): ToggleOption {
    const label = scene.add
      .text(x, 0, text, {
        fontFamily: GAME_STYLE.type.bodyFamily,
        fontSize: `${GAME_STYLE.type.footerSize}px`,
        color: GAME_STYLE.textColor.faintInk,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)
    const underline = scene.add.rectangle(
      x,
      8,
      text === "DIGITAL" ? 42 : 62,
      1,
      GAME_STYLE.color.mutedInk,
      GAME_STYLE.alpha.softRule,
    )
    const hitTarget = scene.add
      .zone(
        x,
        0,
        text === "DIGITAL" ? 70 : 92,
        GAME_LAYOUT.keyboardPresentationToggle.hitHeight,
      )
      .setInteractive({ useHandCursor: true })
    hitTarget.on(Phaser.Input.Events.POINTER_DOWN, () => onChange(id))
    this.add(hitTarget)

    return { id, label, underline }
  }
}

