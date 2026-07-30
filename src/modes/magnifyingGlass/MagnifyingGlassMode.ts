import Phaser from "phaser"
import { GAME_LAYOUT } from "../../style/layout"
import { GAME_MOTION } from "../../style/motion"
import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import { LensMotionModel } from "./LensMotionModel"
import { LensView } from "./LensView"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"
import { TileBurnAttachment } from "./TileBurnAttachment"

export class MagnifyingGlassMode implements ObscuringMode {
  private motion?: LensMotionModel
  private view?: LensView
  private scene?: Phaser.Scene
  private readonly burns = new Map<
    Phaser.GameObjects.Container,
    TileBurnAttachment
  >()
  private readonly eligibilityTimers: Phaser.Time.TimerEvent[] = []

  start(context: ModeContext): void {
    this.stop(context)
    this.scene = context.scene
    this.motion = new LensMotionModel()
    this.view = new LensView(
      context.scene,
      context.board.tiles(),
      this.motion.position,
    )
  }

  onGuessSubmitted(context: ModeContext, row: number): void {
    this.motion?.setSubmittedRows(row + 1)

    for (let column = 0; column < GAME_LAYOUT.board.columns; column += 1) {
      const tile = context.board.tileAt(row, column)
      if (!tile) continue

      const delay =
        GAME_MOTION.tile.inkBloom.duration +
        column * GAME_MOTION.tile.revealStagger +
        MAGNIFYING_GLASS_CONFIG.burn
          .eligibilityDelayAfterRevealMs
      const timer = context.scene.time.delayedCall(delay, () => {
        if (!this.scene || this.burns.has(tile)) return

        this.burns.set(
          tile,
          new TileBurnAttachment(tile, row * 17 + column * 31 + 1),
        )
      })
      this.eligibilityTimers.push(timer)
    }
  }

  update(context: ModeContext, deltaMs: number): void {
    const position = this.motion?.update(deltaMs)
    if (!position) return

    this.view?.update(position)
    const deltaSeconds = Math.min(Math.max(deltaMs, 0), 100) / 1_000
    for (const burn of this.burns.values()) {
      burn.applyExposure(
        position,
        deltaSeconds,
        context.scene.time.now,
      )
    }
  }

  stop(_context: ModeContext): void {
    for (const timer of this.eligibilityTimers) {
      timer.remove()
    }
    this.eligibilityTimers.length = 0

    for (const burn of this.burns.values()) {
      burn.destroy()
    }
    this.burns.clear()

    this.view?.destroy()
    this.view = undefined
    this.motion = undefined
    this.scene = undefined
  }
}
