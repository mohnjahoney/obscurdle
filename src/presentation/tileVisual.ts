import Phaser from "phaser"
import {
  GAME_STYLE,
  tileFill,
  tileInk,
  type EvaluationVisualState,
} from "../style/gameStyle"
import { GAME_LAYOUT } from "../style/layout"
import { RENDER_SCALE } from "../style/rendering"
import { PIGMENT_TEXTURE_KEY } from "./pigmentTextures"
import {
  boardPresentation,
  type BoardPresentationId,
} from "./board/BoardPresentation"

export interface TileVisual {
  face: Phaser.GameObjects.Rectangle
  pigment: Phaser.GameObjects.Image
  letter: Phaser.GameObjects.Text
  objects: Phaser.GameObjects.GameObject[]
  presentationId: BoardPresentationId
}

export function createTileVisual(
  scene: Phaser.Scene,
  letter = "",
  state: EvaluationVisualState = "empty",
  pigmentFrame = 0,
  presentationId: BoardPresentationId = "standard",
): TileVisual {
  const size = GAME_LAYOUT.board.tileSize
  const face = scene.add.rectangle(0, 0, size, size)
  const pigment = scene.add
    .image(0, 0, PIGMENT_TEXTURE_KEY, pigmentFrame)
    .setDisplaySize(size, size)
  const letterText = scene.add
    .text(0, 1, letter, {
      fontFamily: GAME_STYLE.type.displayFamily,
      fontSize: `${GAME_STYLE.type.tileSize}px`,
      fontStyle: "bold",
      color: GAME_STYLE.textColor.ink,
      resolution: RENDER_SCALE,
    })
    .setOrigin(0.5)

  const visual = {
    face,
    pigment,
    letter: letterText,
    objects: [face, pigment, letterText],
    presentationId,
  }
  applyTileVisualState(visual, state)

  return visual
}

export function applyTileVisualState(
  visual: TileVisual,
  state: EvaluationVisualState,
): void {
  const presentation = boardPresentation(visual.presentationId)
  const isEvaluated =
    state === "correct" || state === "present" || state === "absent"
  const canRenderPigment =
    isEvaluated && visual.face.scene.game.renderer.type === Phaser.WEBGL

  visual.face.setFillStyle(
    canRenderPigment ? GAME_STYLE.color.emptyTile : tileFill(state),
  )
  visual.face.setAlpha(
    presentation.showUnevaluatedFace || isEvaluated ? 1 : 0,
  )
  if (!presentation.showTileOutline) {
    visual.face.setStrokeStyle()
  } else {
    visual.face.setStrokeStyle(
      state === "filled"
        ? GAME_STYLE.tile.activeBorderWidth
        : GAME_STYLE.tile.borderWidth,
      state === "correct" || state === "present" || state === "absent"
        ? tileFill(state)
        : GAME_STYLE.color.rule,
      GAME_STYLE.alpha.rule,
    )
  }
  visual.pigment
    .setTint(tileFill(state))
    .setAlpha(GAME_STYLE.tile.pigmentOpacity)
    .setVisible(canRenderPigment)
  visual.letter.setColor(tileInk(state))
}
