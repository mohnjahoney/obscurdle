import type Phaser from "phaser"
import type { MagnifyingGlassModePresentationState } from "../../presentation/model/ModePresentationState"
import { GAME_LAYOUT } from "../../style/layout"
import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import { LensMotionModel, type LensPoint } from "./LensMotionModel"
import {
  MAGNIFYING_GLASS_CONFIG,
  MAGNIFYING_GLASS_CONTROL,
} from "./magnifyingGlassConfig"
import { TileBurnModel } from "./TileBurnModel"
import { PaperBurnModel } from "./PaperBurnModel"

const POINTER_DOWN = "pointerdown"
const POINTER_MOVE = "pointermove"
const POINTER_UP = "pointerup"

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export class MagnifyingGlassMode implements ObscuringMode {
  private active = true
  private motion = new LensMotionModel()
  private burnRate: number =
    MAGNIFYING_GLASS_CONFIG.burn.heatGainPerSecond
  private automaticMotion: boolean =
    MAGNIFYING_GLASS_CONFIG.burn.debugRateControl
      .automaticMotionInitiallyEnabled
  private currentPosition: LensPoint = this.motion.position
  private draggingLens = false
  private readonly dragOffset: LensPoint = { x: 0, y: 0 }
  private readonly burns = new Map<string, TileBurnModel>()
  private paperBurn = new PaperBurnModel()
  private hasSubmittedWord = false

  presentationState(): MagnifyingGlassModePresentationState {
    return {
      kind: "magnifying-glass",
      active: this.active,
      position: { ...this.currentPosition },
      burnRate: this.burnRate,
      automaticMotion: this.automaticMotion,
      burns: Array.from(this.burns.values(), (burn) =>
        burn.presentationState(),
      ),
      paperBurn: this.paperBurn.presentationState(),
    }
  }

  start(context: ModeContext): void {
    this.stop(context)
    this.active = true
    this.burnRate = MAGNIFYING_GLASS_CONFIG.burn.heatGainPerSecond
    this.automaticMotion =
      MAGNIFYING_GLASS_CONFIG.burn.debugRateControl
        .automaticMotionInitiallyEnabled
    this.motion = new LensMotionModel()
    this.paperBurn = new PaperBurnModel()
    this.hasSubmittedWord = false
    this.currentPosition = this.motion.position

    context.scene.input.on(POINTER_DOWN, this.handlePointerDown, this)
    context.scene.input.on(POINTER_MOVE, this.handlePointerMove, this)
    context.scene.input.on(POINTER_UP, this.handlePointerUp, this)
  }

  onGuessSubmitted(_context: ModeContext, row: number): void {
    this.motion.setSubmittedRows(row + 1)
    this.hasSubmittedWord = true

    for (let column = 0; column < GAME_LAYOUT.board.columns; column += 1) {
      const key = `${row}:${column}`
      if (!this.burns.has(key)) {
        this.burns.set(
          key,
          new TileBurnModel(row, column, row * 17 + column * 31 + 1),
        )
      }
    }
  }

  onSceneEffectControlChange(name: string, value: number): boolean {
    if (name === MAGNIFYING_GLASS_CONTROL.burnRate) {
      const control = MAGNIFYING_GLASS_CONFIG.burn.debugRateControl
      const next = clamp(value, control.minimum, control.maximum)
      if (next === this.burnRate) return false
      this.burnRate = next
      return true
    }
    if (name === MAGNIFYING_GLASS_CONTROL.automaticMotion) {
      return this.setAutomaticMotion(value !== 0)
    }
    return false
  }

  update(context: ModeContext, deltaMs: number): boolean {
    if (!this.active) return false

    const position = this.automaticMotion
      ? this.motion.update(deltaMs)
      : this.currentPosition
    this.currentPosition = position

    const deltaSeconds = Math.min(Math.max(deltaMs, 0), 100) / 1_000
    if (context.boardPresentation() === "tiles") {
      for (const burn of this.burns.values()) {
        burn.applyExposure(
          position,
          context.letterBasePlacementAt(burn.row, burn.column),
          deltaSeconds,
          this.burnRate,
        )
      }
    } else if (this.hasSubmittedWord) {
      this.paperBurn.applyExposure(
        position,
        deltaSeconds,
        this.burnRate,
      )
    }
    return true
  }

  stop(context: ModeContext): void {
    context.scene.input.off(POINTER_DOWN, this.handlePointerDown, this)
    context.scene.input.off(POINTER_MOVE, this.handlePointerMove, this)
    context.scene.input.off(POINTER_UP, this.handlePointerUp, this)
    this.burns.clear()
    this.paperBurn = new PaperBurnModel()
    this.hasSubmittedWord = false
    this.draggingLens = false
    this.active = false
  }

  private setAutomaticMotion(enabled: boolean): boolean {
    if (enabled === this.automaticMotion) return false
    this.automaticMotion = enabled
    this.draggingLens = false

    if (enabled && this.motion.phase === "roaming") {
      this.motion.reposition(this.currentPosition)
    }
    return true
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.automaticMotion) return

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
    if (this.automaticMotion || !this.draggingLens || !pointer.isDown) return

    const bounds = MAGNIFYING_GLASS_CONFIG.motion.bounds
    const rowStep = GAME_LAYOUT.board.tileSize + GAME_LAYOUT.board.gap
    const boardBottom =
      GAME_LAYOUT.board.top +
      (GAME_LAYOUT.board.rows - 1) * rowStep +
      GAME_LAYOUT.board.tileSize -
      12
    this.currentPosition = {
      x: clamp(pointer.worldX + this.dragOffset.x, bounds.left, bounds.right),
      y: clamp(pointer.worldY + this.dragOffset.y, bounds.top, boardBottom),
    }
  }

  private handlePointerUp(): void {
    this.draggingLens = false
  }
}
