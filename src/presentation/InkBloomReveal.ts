import Phaser from "phaser"
import type { LetterResult } from "../core/evaluateGuess"
import { GAME_LAYOUT } from "../style/layout"
import { GAME_MOTION } from "../style/motion"
import {
  createInkBloomParameters,
  INK_BLOOM_FRAGMENT_SHADER,
} from "./inkBloom"
import type { BoardPresentationId } from "./board/BoardPresentation"
import {
  createLetterCellVisual,
  type LetterCellVisual,
} from "./letterCellVisual"

interface InkBloomRevealOptions {
  scene: Phaser.Scene
  parent: Phaser.GameObjects.Container
  letter: string
  result: LetterResult
  presentation: BoardPresentationId
  pigmentFrame: number
  delay: number
  legibleProgress?: number
  onLegible?(): void
  onComplete(visual: LetterCellVisual): void
}

let nextMaskId = 0

export class InkBloomReveal {
  private readonly scene: Phaser.Scene
  private readonly parent: Phaser.GameObjects.Container
  private readonly evaluatedVisual: LetterCellVisual
  private readonly evaluatedLayer: Phaser.GameObjects.Container
  private readonly maskShader: Phaser.GameObjects.Shader
  private readonly progress = { value: 0 }
  private readonly onComplete: (visual: LetterCellVisual) => void
  private readonly onLegible?: () => void
  private readonly legibleProgress: number
  private tween?: Phaser.Tweens.Tween
  private destroyed = false
  private promoted = false
  private reportedLegible = false

  constructor(options: InkBloomRevealOptions) {
    this.scene = options.scene
    this.parent = options.parent
    this.onComplete = options.onComplete
    this.onLegible = options.onLegible
    this.legibleProgress = Phaser.Math.Clamp(options.legibleProgress ?? 0, 0, 1)

    const size = GAME_LAYOUT.board.tileSize
    const parameters = createInkBloomParameters()
    const maskTextureKey = `obscurdle-ink-mask-${nextMaskId++}`
    this.evaluatedVisual = createLetterCellVisual(
      options.scene,
      options.presentation,
      options.letter,
      options.result,
      options.pigmentFrame,
    )

    this.evaluatedLayer = options.scene.add
      .container(0, 0, this.evaluatedVisual.objects)
      .setSize(size, size)
      .setVisible(false)
    options.parent.add(this.evaluatedLayer)

    this.maskShader = options.scene.add.shader(
      {
        name: "obscurdleInkBloomMask",
        fragmentSource: INK_BLOOM_FRAGMENT_SHADER,
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          setUniform("uProgress", this.progress.value)
          setUniform("uOrigin", parameters.origin)
          setUniform("uSeed", parameters.seed)
          setUniform("uEdgeNoise", GAME_MOTION.tile.inkBloom.edgeNoise)
          setUniform("uEdgeFeather", GAME_MOTION.tile.inkBloom.edgeFeather)
          setUniform(
            "uPigmentVariation",
            GAME_MOTION.tile.inkBloom.pigmentVariation,
          )
          setUniform(
            "uSettleStartProgress",
            GAME_MOTION.tile.inkBloom.settleStartProgress,
          )
        },
      },
      size / 2,
      size / 2,
      size,
      size,
    )
    this.maskShader.setRenderToTexture(maskTextureKey).removeFromDisplayList()
    this.evaluatedLayer.enableFilters()
    this.evaluatedLayer.filters!.internal.addMask(maskTextureKey)

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)

    this.tween = options.scene.tweens.add({
      targets: this.progress,
      value: 1,
      duration: GAME_MOTION.tile.inkBloom.duration,
      delay: options.delay,
      ease: "Linear",
      onStart: () => {
        this.evaluatedLayer.setVisible(true)
      },
      onUpdate: () => {
        this.maskShader.renderImmediate()
        this.reportLegibleIfReady()
      },
      onComplete: () => {
        this.reportLegible()
        this.promote()
      },
    })
  }

  setLetterInkAlpha(alpha: number): void {
    this.evaluatedVisual.letter.setAlpha(alpha)
  }

  private reportLegibleIfReady(): void {
    if (this.progress.value >= this.legibleProgress) {
      this.reportLegible()
    }
  }

  private reportLegible(): void {
    if (this.reportedLegible) return
    this.reportedLegible = true
    this.onLegible?.()
  }

  private promote(): void {
    this.promoted = true

    // Remove the mask-bearing container but keep its rendered children.
    this.evaluatedLayer.removeAll(false)
    this.evaluatedLayer.destroy(false)
    this.parent.add(this.evaluatedVisual.objects)

    this.onComplete(this.evaluatedVisual)
    this.destroy()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true

    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
    this.tween?.remove()
    this.tween = undefined

    // Destroy the mask consumer before releasing its render texture.
    if (!this.promoted) {
      this.evaluatedLayer.destroy(true)
    }
    this.maskShader.destroy()
  }
}
