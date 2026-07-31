import Phaser from "phaser"
import { GAME_LAYOUT } from "../../style/layout"
import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import {
  LensMotionModel,
  type LensPoint,
} from "./LensMotionModel"
import { LensView } from "./LensView"
import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"
import { MagnifyingGlassDebugControls } from "./MagnifyingGlassDebugControls"
import { TileBurnAttachment } from "./TileBurnAttachment"

export class MagnifyingGlassMode implements ObscuringMode {
  private motion?: LensMotionModel
  private view?: LensView
  private debugControls?: MagnifyingGlassDebugControls
  private burnRate: number =
    MAGNIFYING_GLASS_CONFIG.burn.heatGainPerSecond
  private automaticMotion = true
  private currentPosition?: LensPoint
  private draggingLens = false
  private readonly dragOffset: LensPoint = { x: 0, y: 0 }
  private readonly burns = new Map<
    Phaser.GameObjects.Container,
    TileBurnAttachment
  >()

  start(context: ModeContext): void {
    this.stop(context)
    this.burnRate = MAGNIFYING_GLASS_CONFIG.burn.heatGainPerSecond
    this.automaticMotion =
      MAGNIFYING_GLASS_CONFIG.burn.debugRateControl
        .automaticMotionInitiallyEnabled
    this.motion = new LensMotionModel()
    this.currentPosition = this.motion.position
    this.view = new LensView(
      context.scene,
      context.board.tiles(),
      this.currentPosition,
    )

    const debugControl = MAGNIFYING_GLASS_CONFIG.burn.debugRateControl
    if (debugControl.enabled) {
      this.debugControls = new MagnifyingGlassDebugControls({
        initialValue: this.burnRate,
        minimum: debugControl.minimum,
        maximum: debugControl.maximum,
        step: debugControl.step,
        automaticMotionInitiallyEnabled: this.automaticMotion,
        onChange: (value) => {
          this.burnRate = value
        },
        onAutomaticMotionChange: (enabled) => {
          this.setAutomaticMotion(enabled)
        },
      })
    }

    context.scene.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      this.handlePointerDown,
      this,
    )
    context.scene.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      this.handlePointerMove,
      this,
    )
    context.scene.input.on(
      Phaser.Input.Events.POINTER_UP,
      this.handlePointerUp,
      this,
    )
  }

  onGuessSubmitted(context: ModeContext, row: number): void {
    this.motion?.setSubmittedRows(row + 1)

    for (let column = 0; column < GAME_LAYOUT.board.columns; column += 1) {
      const tile = context.board.tileAt(row, column)
      if (!tile || this.burns.has(tile)) continue

      this.burns.set(
        tile,
        new TileBurnAttachment(tile, row * 17 + column * 31 + 1),
      )
    }
  }

  update(context: ModeContext, deltaMs: number): void {
    const position = this.automaticMotion
      ? this.motion?.update(deltaMs)
      : this.currentPosition
    if (!position) return
    this.currentPosition = position

    this.view?.update(position)
    const deltaSeconds = Math.min(Math.max(deltaMs, 0), 100) / 1_000
    for (const burn of this.burns.values()) {
      burn.applyExposure(
        position,
        deltaSeconds,
        context.scene.time.now,
        this.burnRate,
      )
    }
  }

  stop(context: ModeContext): void {
    context.scene.input.off(
      Phaser.Input.Events.POINTER_DOWN,
      this.handlePointerDown,
      this,
    )
    context.scene.input.off(
      Phaser.Input.Events.POINTER_MOVE,
      this.handlePointerMove,
      this,
    )
    context.scene.input.off(
      Phaser.Input.Events.POINTER_UP,
      this.handlePointerUp,
      this,
    )

    for (const burn of this.burns.values()) {
      burn.destroy()
    }
    this.burns.clear()

    this.view?.destroy()
    this.view = undefined
    this.debugControls?.destroy()
    this.debugControls = undefined
    this.motion = undefined
    this.currentPosition = undefined
    this.draggingLens = false
  }

  private setAutomaticMotion(enabled: boolean): void {
    this.automaticMotion = enabled
    this.draggingLens = false

    if (enabled && this.currentPosition) {
      this.motion?.reposition(this.currentPosition)
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.automaticMotion || !this.currentPosition) return

    const distanceFromLens = Math.hypot(
      pointer.worldX - this.currentPosition.x,
      pointer.worldY - this.currentPosition.y,
    )
    if (distanceFromLens > MAGNIFYING_GLASS_CONFIG.lens.radius) return

    this.draggingLens = true
    this.dragOffset.x = this.currentPosition.x - pointer.worldX
    this.dragOffset.y = this.currentPosition.y - pointer.worldY
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (
      this.automaticMotion ||
      !this.draggingLens ||
      !pointer.isDown
    ) {
      return
    }

    const bounds = MAGNIFYING_GLASS_CONFIG.motion.bounds
    const rowStep =
      GAME_LAYOUT.board.tileSize + GAME_LAYOUT.board.gap
    const boardBottom =
      GAME_LAYOUT.board.top +
      (GAME_LAYOUT.board.rows - 1) * rowStep +
      GAME_LAYOUT.board.tileSize -
      12
    this.currentPosition = {
      x: Phaser.Math.Clamp(
        pointer.worldX + this.dragOffset.x,
        bounds.left,
        bounds.right,
      ),
      y: Phaser.Math.Clamp(
        pointer.worldY + this.dragOffset.y,
        bounds.top,
        boardBottom,
      ),
    }
  }

  private handlePointerUp(): void {
    this.draggingLens = false
  }
}
