import Phaser from "phaser"
import type { BoardPresentationId } from "./board/BoardPresentation"
import {
  GAME_STYLE,
  tileFill,
  tileInk,
  type EvaluationVisualState,
} from "../style/gameStyle"
import { GAME_LAYOUT } from "../style/layout"
import { RENDER_SCALE } from "../style/rendering"
import { PIGMENT_TEXTURE_KEY } from "./pigmentTextures"

export interface LetterCellVisual {
  face: Phaser.GameObjects.Rectangle
  pigment: Phaser.GameObjects.Image
  letter: Phaser.GameObjects.Text
  objects: Phaser.GameObjects.GameObject[]
}

export function createLetterCellVisual(
  scene: Phaser.Scene,
  presentation: BoardPresentationId,
  letter = "",
  state: EvaluationVisualState = "empty",
  pigmentFrame = 0,
): LetterCellVisual {
  const size = GAME_LAYOUT.board.tileSize
  const face = scene.add.rectangle(0, 0, size, size)
  const pigment = scene.add
    .image(0, 0, PIGMENT_TEXTURE_KEY, pigmentFrame)
    .setDisplaySize(size, size)
  const letterText = scene.add
    .text(0, 1, letter, {
      fontFamily:
        presentation === "bare"
          ? GAME_STYLE.type.bareLetterFamily
          : GAME_STYLE.type.displayFamily,
      fontSize: `${
        presentation === "bare"
          ? GAME_STYLE.type.bareLetterSize
          : GAME_STYLE.type.tileSize
      }px`,
      fontStyle: presentation === "bare" ? "normal" : "bold",
      color: GAME_STYLE.textColor.ink,
      resolution: RENDER_SCALE,
    })
    .setOrigin(0.5)

  const visual = {
    face,
    pigment,
    letter: letterText,
    objects: [face, pigment, letterText],
  }
  applyLetterCellVisualState(visual, presentation, state)
  return visual
}

export function applyLetterCellVisualState(
  visual: LetterCellVisual,
  presentation: BoardPresentationId,
  state: EvaluationVisualState,
): void {
  if (presentation === "bare") {
    visual.face.setVisible(false)
    visual.pigment.setVisible(false)
    visual.letter.setColor(bareLetterInk(state))
    return
  }

  const isEvaluated =
    state === "correct" || state === "present" || state === "absent"
  const canRenderPigment =
    isEvaluated && visual.face.scene.game.renderer.type === Phaser.WEBGL

  visual.face
    .setVisible(true)
    .setFillStyle(
      canRenderPigment ? GAME_STYLE.color.emptyTile : tileFill(state),
    )
    .setAlpha(1)
    .setStrokeStyle(
      state === "filled"
        ? GAME_STYLE.tile.activeBorderWidth
        : GAME_STYLE.tile.borderWidth,
      isEvaluated ? tileFill(state) : GAME_STYLE.color.rule,
      GAME_STYLE.alpha.rule,
    )
  visual.pigment
    .setTint(tileFill(state))
    .setAlpha(GAME_STYLE.tile.pigmentOpacity)
    .setVisible(canRenderPigment)
  visual.letter.setColor(tileInk(state))
}

function bareLetterInk(state: EvaluationVisualState): string {
  if (state === "correct") return GAME_STYLE.textColor.editorialCorrect
  return GAME_STYLE.textColor.ink
}
