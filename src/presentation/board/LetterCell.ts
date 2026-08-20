import Phaser from "phaser"
import type { LetterResult } from "../../core/evaluateGuess"
import type { EvaluationVisualState } from "../../style/gameStyle"
import { GAME_STYLE } from "../../style/gameStyle"
import { GAME_MOTION } from "../../style/motion"
import { InkBloomReveal } from "../InkBloomReveal"
import {
  applyLetterCellVisualState,
  createLetterCellVisual,
  type LetterCellVisual,
} from "../letterCellVisual"
import type { BoardPresentationId } from "./BoardPresentation"

type CellOverlay = Phaser.GameObjects.GameObject & {
  setVisible(visible: boolean): Phaser.GameObjects.GameObject
}

interface CellOverlayOptions {
  onRevealStart?(): void
  onRevealComplete?(): void
}

export interface EditorialLetterBounds {
  left: number
  right: number
  centerY: number
}

export class LetterCell extends Phaser.GameObjects.Container {
  private visual: LetterCellVisual
  private activeReveal?: InkBloomReveal
  private readonly overlays = new Map<CellOverlay, CellOverlayOptions>()
  private visualStateValue: EvaluationVisualState = "empty"
  private baseX: number
  private baseY: number
  private offsetX = 0
  private depthOffset = 0
  private readonly presentationDepth: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly pigmentFrame: number,
    private readonly presentation: BoardPresentationId,
  ) {
    super(scene, x, y)
    scene.add.existing(this)
    this.baseX = x
    this.baseY = y
    this.presentationDepth = this.depth

    this.visual = createLetterCellVisual(
      scene,
      presentation,
      "",
      "empty",
      pigmentFrame,
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

  setEvaluatedLetter(letter: string, result: LetterResult): void {
    this.visual.letter.setText(letter)
    this.applyState(result)
  }

  setPresentationTransform(offsetX: number, depthOffset: number): void {
    this.offsetX = offsetX
    this.depthOffset = depthOffset
    this.applyResolvedTransform()
  }

  setBasePlacement(x: number, y: number): void {
    this.baseX = x
    this.baseY = y
    this.applyResolvedTransform()
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

    const crossfade = this.presentation === "bare" && legibleProgress !== undefined
    const transitionDuration =
      result === "absent"
        ? GAME_MOTION.editorial.strikeDuration
        : GAME_MOTION.editorial.highlightDuration

    this.activeReveal = new InkBloomReveal({
      scene: this.scene,
      parent: this,
      letter: revealedLetter,
      result,
      presentation: this.presentation,
      pigmentFrame: this.pigmentFrame,
      delay,
      duration: crossfade ? transitionDuration : undefined,
      crossfade,
      originalLetter: this.visual.letter,
      legibleProgress,
      onLegible,
      onComplete: (evaluatedVisual) => {
        for (const object of this.visual.objects) object.destroy()
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
    overlay: CellOverlay,
    options: CellOverlayOptions = {},
  ): void {
    this.overlays.set(overlay, options)
    this.add(overlay)
  }

  detachOverlay(overlay: CellOverlay): void {
    this.overlays.delete(overlay)
    this.remove(overlay)
  }

  setLetterInkAlpha(alpha: number): void {
    this.visual.letter.setAlpha(alpha)
    this.activeReveal?.setLetterInkAlpha(alpha)
  }

  get visualState(): EvaluationVisualState {
    return this.visualStateValue
  }

  editorialBounds(): EditorialLetterBounds {
    const halfWidth = Math.max(this.visual.letter.width / 2, 5)
    return {
      left: this.baseX - halfWidth,
      right: this.baseX + halfWidth,
      centerY: this.baseY + 1,
    }
  }

  destroy(fromScene?: boolean): void {
    this.activeReveal?.destroy()
    this.activeReveal = undefined
    super.destroy(fromScene)
  }

  private applyState(state: EvaluationVisualState): void {
    this.visualStateValue = state
    applyLetterCellVisualState(this.visual, this.presentation, state)
  }

  private applyResolvedTransform(): void {
    this.setPosition(this.baseX + this.offsetX, this.baseY)
    this.setDepth(this.presentationDepth + this.depthOffset)
  }

  private restoreOverlayOrder(): void {
    for (const overlay of this.overlays.keys()) this.bringToTop(overlay)
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
