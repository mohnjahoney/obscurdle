import Phaser from "phaser"
import type { LetterResult } from "../core/evaluateGuess"
import { GAME_STYLE, tileInk } from "../style/gameStyle"
import { GAME_LAYOUT } from "../style/layout"
import { RENDER_SCALE } from "../style/rendering"
import type {
  KeyboardPresentationId,
  KeyCapPresentation,
  KeyState,
} from "./keyboard/KeyboardPresentation"
import { StandardKeyCap } from "./keyboard/StandardKeyCap"
import { VintageTypewriterKeyCap } from "./keyboard/VintageTypewriterKeyCap"
import type { KeyboardPresentationModel } from "./model/PresentationModel"

interface KeyboardHandlers {
  onLetter(letter: string): void
  onEnter(): void
  onBackspace(): void
}

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] as const
const STATE_RANK: Record<KeyState, number> = {
  empty: 0,
  absent: 1,
  present: 2,
  correct: 3,
}

class KeyView extends Phaser.GameObjects.Container {
  private readonly keyCap: KeyCapPresentation
  private readonly labelText: Phaser.GameObjects.Text
  private keyState: KeyState = "empty"

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    label: string,
    onPress: () => void,
    presentationId: KeyboardPresentationId,
  ) {
    super(scene, x, y)
    scene.add.existing(this)

    this.keyCap =
      presentationId === "vintage-typewriter"
        ? new VintageTypewriterKeyCap(scene, width)
        : new StandardKeyCap(scene, width)

    this.labelText = scene.add
      .text(0, -1, label, {
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

    this.add([...this.keyCap.objects, this.labelText])

    this.keyCap.hitTarget.on(Phaser.Input.Events.POINTER_DOWN, () => {
      onPress()
      this.keyCap.animatePress?.(this)
    })
  }

  applyState(next: KeyState): void {
    if (STATE_RANK[next] <= STATE_RANK[this.keyState]) return
    this.keyState = next
    this.keyCap.applyState(next)
    this.labelText.setColor(tileInk(next))
  }
}

export class KeyboardView {
  private readonly letterKeys = new Map<string, KeyView>()
  private readonly keys: KeyView[] = []

  constructor(
    scene: Phaser.Scene,
    handlers: KeyboardHandlers,
    presentationId: KeyboardPresentationId = "digital",
  ) {
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
        this.keys.push(new KeyView(
          scene,
          cursorX + width / 2,
          y,
          width,
          "ENTER",
          handlers.onEnter,
          presentationId,
        ))
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
          presentationId,
        )
        this.letterKeys.set(letter, key)
        this.keys.push(key)
        cursorX += width + GAME_LAYOUT.keyboard.gap
      }

      if (isFinalRow) {
        const width = GAME_LAYOUT.keyboard.wideKeyWidth
        this.keys.push(new KeyView(
          scene,
          cursorX + width / 2,
          y,
          width,
          "DELETE",
          handlers.onBackspace,
          presentationId,
        ))
      }
    })
  }

  apply(presentation: KeyboardPresentationModel): void {
    for (const [letter, result] of Object.entries(presentation.evaluations)) {
      if (result) this.applyLetterEvaluation(letter, result)
    }
  }

  private applyLetterEvaluation(letter: string, result: LetterResult): void {
    this.letterKeys.get(letter)?.applyState(result)
  }

  destroy(): void {
    for (const key of this.keys) {
      key.destroy(true)
    }
    this.keys.length = 0
    this.letterKeys.clear()
  }
}
