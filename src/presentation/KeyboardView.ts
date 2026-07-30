import Phaser from "phaser"
import type { LetterResult } from "../core/evaluateGuess"
import { GAME_STYLE, tileFill, tileInk } from "../style/gameStyle"
import { GAME_LAYOUT } from "../style/layout"
import { GAME_MOTION } from "../style/motion"
import { RENDER_SCALE } from "../style/rendering"

interface KeyboardHandlers {
  onLetter(letter: string): void
  onEnter(): void
  onBackspace(): void
}

type KeyState = "empty" | LetterResult

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] as const
const STATE_RANK: Record<KeyState, number> = {
  empty: 0,
  absent: 1,
  present: 2,
  correct: 3,
}

class KeyView extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Rectangle
  private readonly labelText: Phaser.GameObjects.Text
  private keyState: KeyState = "empty"

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    label: string,
    onPress: () => void,
  ) {
    super(scene, x, y)
    scene.add.existing(this)

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

    this.labelText = scene.add
      .text(0, 1, label, {
        fontFamily: GAME_STYLE.type.bodyFamily,
        fontSize: `${
          width === GAME_LAYOUT.keyboard.wideKeyWidth
            ? GAME_STYLE.type.wideKeySize
            : GAME_STYLE.type.keySize
        }px`,
        fontStyle: "bold",
        color: GAME_STYLE.textColor.ink,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5)

    this.add([this.face, this.labelText])

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

  applyState(next: KeyState): void {
    if (STATE_RANK[next] <= STATE_RANK[this.keyState]) return
    this.keyState = next
    this.face.setFillStyle(tileFill(next))
    this.face.setStrokeStyle(GAME_STYLE.key.borderWidth, tileFill(next), 1)
    this.labelText.setColor(tileInk(next))
  }
}

export class KeyboardView {
  private readonly letterKeys = new Map<string, KeyView>()

  constructor(scene: Phaser.Scene, handlers: KeyboardHandlers) {
    KEY_ROWS.forEach((letters, rowIndex) => {
      const isFinalRow = rowIndex === KEY_ROWS.length - 1
      const keyWidths = [
        ...(isFinalRow ? [GAME_LAYOUT.keyboard.wideKeyWidth] : []),
        ...Array.from(letters, () => GAME_LAYOUT.keyboard.keyWidth),
        ...(isFinalRow ? [GAME_LAYOUT.keyboard.wideKeyWidth] : []),
      ]
      const totalWidth =
        keyWidths.reduce((sum, width) => sum + width, 0) +
        (keyWidths.length - 1) * GAME_LAYOUT.keyboard.gap
      let cursorX = (GAME_LAYOUT.width - totalWidth) / 2
      const y =
        GAME_LAYOUT.keyboard.top +
        rowIndex * (GAME_LAYOUT.keyboard.keyHeight + GAME_LAYOUT.keyboard.rowGap) +
        GAME_LAYOUT.keyboard.keyHeight / 2

      if (isFinalRow) {
        const width = GAME_LAYOUT.keyboard.wideKeyWidth
        new KeyView(
          scene,
          cursorX + width / 2,
          y,
          width,
          "ENTER",
          handlers.onEnter,
        )
        cursorX += width + GAME_LAYOUT.keyboard.gap
      }

      for (const letter of letters) {
        const width = GAME_LAYOUT.keyboard.keyWidth
        const key = new KeyView(
          scene,
          cursorX + width / 2,
          y,
          width,
          letter,
          () => handlers.onLetter(letter),
        )
        this.letterKeys.set(letter, key)
        cursorX += width + GAME_LAYOUT.keyboard.gap
      }

      if (isFinalRow) {
        const width = GAME_LAYOUT.keyboard.wideKeyWidth
        new KeyView(
          scene,
          cursorX + width / 2,
          y,
          width,
          "DELETE",
          handlers.onBackspace,
        )
      }
    })
  }

  applyEvaluation(word: string, evaluation: LetterResult[]): void {
    for (let index = 0; index < word.length; index += 1) {
      const letter = word[index]
      const result = evaluation[index]
      if (letter && result) {
        this.applyLetterEvaluation(letter, result)
      }
    }
  }

  applyLetterEvaluation(letter: string, result: LetterResult): void {
    this.letterKeys.get(letter)?.applyState(result)
  }
}
