import Phaser from "phaser"
import type { LetterResult } from "../core/evaluateGuess"
import { GAME_STYLE, type EvaluationVisualState } from "../style/gameStyle"
import { GAME_MOTION } from "../style/motion"
import { InkBloomReveal } from "./InkBloomReveal"
import {
  applyTileVisualState,
  createTileVisual,
  type TileVisual,
} from "./tileVisual"
import type { BoardPresentationId } from "./board/BoardPresentation"

type TileOverlay = Phaser.GameObjects.GameObject & {
  setVisible(visible: boolean): Phaser.GameObjects.GameObject
}

interface TileOverlayOptions {
  onRevealStart?(): void
  onRevealComplete?(): void
}

export class TileView extends Phaser.GameObjects.Container {
  private visual: TileVisual
  private activeReveal?: InkBloomReveal
  private readonly overlays = new Map<
    TileOverlay,
    TileOverlayOptions
  >()
  private visualStateValue: EvaluationVisualState = "empty"

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly pigmentFrame: number,
    private readonly presentationId: BoardPresentationId = "standard",
  ) {
    super(scene, x, y)
    scene.add.existing(this)

    this.visual = createTileVisual(
      scene,
      "",
      "empty",
      pigmentFrame,
      presentationId,
    )
    this.add(this.visual.objects)
  }

  setLetter(letter: string, animate = true): void {
    this.visual.letter.setText(letter)
    this.applyState(letter ? "filled" : "empty")

    if (letter && animate) {
      this.scene.tweens.add({
        targets: this,
        scaleX: GAME_STYLE.tile.popScale,
        scaleY: GAME_STYLE.tile.popScale,
        duration: GAME_MOTION.tile.typeDuration,
        yoyo: true,
        ease: "Sine.Out",
      })
    }
  }

  reveal(
    result: LetterResult,
    delay: number,
    revealedLetter = this.visual.letter.text,
    onLegible?: () => void,
    legibleProgress?: number,
  ): void {
    this.notifyOverlaysRevealStart()

    if (this.scene.game.renderer.type !== Phaser.WEBGL) {
      this.scene.time.delayedCall(delay, () => {
        this.visual.letter.setText(revealedLetter)
        this.applyState(result)
        this.notifyOverlaysRevealComplete()
        this.restoreOverlayOrder()
        onLegible?.()
      })
      return
    }

    this.activeReveal = new InkBloomReveal({
      scene: this.scene,
      parent: this,
      letter: revealedLetter,
      result,
      pigmentFrame: this.pigmentFrame,
      presentationId: this.presentationId,
      delay,
      legibleProgress,
      onLegible,
      onComplete: (evaluatedVisual) => {
        for (const object of this.visual.objects) {
          object.destroy()
        }
        this.visual = evaluatedVisual
        this.visualStateValue = result
        this.activeReveal = undefined
        this.notifyOverlaysRevealComplete()
        this.restoreOverlayOrder()
      },
    })
    this.restoreOverlayOrder()
  }

  attachOverlay(
    overlay: TileOverlay,
    options: TileOverlayOptions = {},
  ): void {
    this.overlays.set(overlay, options)
    this.add(overlay)
  }

  detachOverlay(overlay: TileOverlay): void {
    this.overlays.delete(overlay)
    this.remove(overlay)
  }

  setLetterInkAlpha(alpha: number): void {
    this.visual.letter.setAlpha(alpha)
    this.activeReveal?.setLetterInkAlpha(alpha)
  }

  private applyState(state: EvaluationVisualState): void {
    this.visualStateValue = state
    applyTileVisualState(this.visual, state)
  }

  get visualState(): EvaluationVisualState {
    return this.visualStateValue
  }

  private restoreOverlayOrder(): void {
    for (const overlay of this.overlays.keys()) {
      this.bringToTop(overlay)
    }
  }

  private notifyOverlaysRevealStart(): void {
    for (const [overlay, options] of this.overlays) {
      options.onRevealStart?.()
      overlay.setVisible(true)
    }
  }

  private notifyOverlaysRevealComplete(): void {
    for (const options of this.overlays.values()) {
      options.onRevealComplete?.()
    }
  }
}
