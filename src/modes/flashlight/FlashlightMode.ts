import type Phaser from "phaser"
import type { FlashlightModePresentationState } from "../../presentation/model/ModePresentationState"
import { GAME_LAYOUT } from "../../style/layout"
import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import type { FlashlightUniformValue } from "./FlashlightDistribution"
import { FLASHLIGHT_CONFIG } from "./flashlightConfig"

const POINTER_DOWN = "pointerdown"
const POINTER_MOVE = "pointermove"
const POINTER_UP = "pointerup"

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function linear(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}

interface AimPoint {
  x: number
  y: number
}

export class FlashlightMode implements ObscuringMode {
  private active = true
  private draggingTouch = false
  private lastUpdateAt = 0
  private readonly target: AimPoint = {
    x: FLASHLIGHT_CONFIG.initialTarget[0],
    y: FLASHLIGHT_CONFIG.initialTarget[1],
  }
  private readonly desiredTarget: AimPoint = {
    x: FLASHLIGHT_CONFIG.initialTarget[0],
    y: FLASHLIGHT_CONFIG.initialTarget[1],
  }
  private readonly uniformOverrides = new Map<
    string,
    FlashlightUniformValue
  >()

  presentationState(): FlashlightModePresentationState {
    return {
      kind: "flashlight",
      active: this.active,
      distribution: FLASHLIGHT_CONFIG.distribution,
      target: [this.target.x, this.target.y],
      uniformOverrides: Object.fromEntries(this.uniformOverrides),
    }
  }

  start(context: ModeContext): void {
    this.stop(context)
    this.active = true
    this.target.x = FLASHLIGHT_CONFIG.initialTarget[0]
    this.target.y = FLASHLIGHT_CONFIG.initialTarget[1]
    this.desiredTarget.x = this.target.x
    this.desiredTarget.y = this.target.y
    this.lastUpdateAt = context.scene.time.now

    context.scene.input.on(
      POINTER_DOWN,
      this.handlePointerDown,
      this,
    )
    context.scene.input.on(
      POINTER_MOVE,
      this.handlePointerMove,
      this,
    )
    context.scene.input.on(
      POINTER_UP,
      this.handlePointerUp,
      this,
    )
  }

  onSceneEffectControlChange(name: string, value: number): boolean {
    if (this.uniformOverrides.get(name) === value) return false
    this.uniformOverrides.set(name, value)
    return true
  }

  update(context: ModeContext): boolean {
    if (!this.active) return false

    const now = context.scene.time.now
    const delta = Math.min(Math.max(now - this.lastUpdateAt, 0), 50)
    const blend = 1 - Math.exp(-delta / FLASHLIGHT_CONFIG.aimSmoothingMs)
    this.target.x = linear(
      this.target.x,
      this.desiredTarget.x,
      blend,
    )
    this.target.y = linear(
      this.target.y,
      this.desiredTarget.y,
      blend,
    )
    this.lastUpdateAt = now
    return true
  }

  stop(context: ModeContext): void {
    context.scene.input.off(
      POINTER_DOWN,
      this.handlePointerDown,
      this,
    )
    context.scene.input.off(
      POINTER_MOVE,
      this.handlePointerMove,
      this,
    )
    context.scene.input.off(
      POINTER_UP,
      this.handlePointerUp,
      this,
    )
    this.uniformOverrides.clear()
    this.draggingTouch = false
    this.active = false
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) {
      this.draggingTouch = pointer.worldY < GAME_LAYOUT.keyboard.top
      if (this.draggingTouch) this.aimAt(pointer, true)
      return
    }

    this.aimAt(pointer, false)
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.wasTouch) {
      if (this.draggingTouch && pointer.isDown) this.aimAt(pointer, true)
      return
    }

    this.aimAt(pointer, false)
  }

  private handlePointerUp(): void {
    this.draggingTouch = false
  }

  private aimAt(pointer: Phaser.Input.Pointer, offsetForTouch: boolean): void {
    const touchOffset = offsetForTouch ? FLASHLIGHT_CONFIG.touchOffsetY : 0

    this.desiredTarget.x = clamp(
      pointer.worldX / GAME_LAYOUT.width,
      0.02,
      0.98,
    )
    this.desiredTarget.y = clamp(
      (pointer.worldY - touchOffset) / GAME_LAYOUT.height,
      0.04,
      0.96,
    )
  }
}
