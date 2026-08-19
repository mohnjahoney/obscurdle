import type Phaser from "phaser"
import { LensView } from "../../modes/magnifyingGlass/LensView"
import {
  MAGNIFYING_GLASS_CONFIG,
  MAGNIFYING_GLASS_CONTROL,
} from "../../modes/magnifyingGlass/magnifyingGlassConfig"
import { MagnifyingGlassDebugControls } from "../../modes/magnifyingGlass/MagnifyingGlassDebugControls"
import { TileBurnAttachment } from "../../modes/magnifyingGlass/TileBurnAttachment"
import type { BoardRenderer } from "../board/BoardRenderer"
import type { MagnifyingGlassEffectPresentationModel } from "../model/PresentationModel"
import { PaperBurnLayer } from "./PaperBurnLayer"
import { PaperApertureLayer } from "./PaperApertureLayer"

interface MagnifyingGlassEffectRendererHandlers {
  onControlChange?(name: string, value: number): void
}

export class MagnifyingGlassEffectRenderer {
  private readonly lens: LensView
  private readonly debugControls?: MagnifyingGlassDebugControls
  private readonly burns = new Map<string, TileBurnAttachment>()
  private readonly paperBurn?: PaperBurnLayer
  private readonly paperAperture?: PaperApertureLayer

  constructor(
    scene: Phaser.Scene,
    private readonly board: BoardRenderer,
    presentation: MagnifyingGlassEffectPresentationModel,
    handlers: MagnifyingGlassEffectRendererHandlers = {},
  ) {
    this.lens = new LensView(
      scene,
      board.cells(),
      presentation.position,
    )
    if (board.presentation === "bare") {
      this.paperBurn = new PaperBurnLayer(scene)
      this.paperAperture = new PaperApertureLayer(scene)
    }

    const control = MAGNIFYING_GLASS_CONFIG.burn.debugRateControl
    if (control.enabled) {
      this.debugControls = new MagnifyingGlassDebugControls({
        initialValue: presentation.burnRate,
        minimum: control.minimum,
        maximum: control.maximum,
        step: control.step,
        automaticMotionInitiallyEnabled: presentation.automaticMotion,
        onChange: (value) => {
          handlers.onControlChange?.(
            MAGNIFYING_GLASS_CONTROL.burnRate,
            value,
          )
        },
        onAutomaticMotionChange: (enabled) => {
          handlers.onControlChange?.(
            MAGNIFYING_GLASS_CONTROL.automaticMotion,
            enabled ? 1 : 0,
          )
        },
      })
    }

    this.apply(presentation)
  }

  apply(presentation: MagnifyingGlassEffectPresentationModel): void {
    this.lens.update(presentation.position)
    if (this.paperBurn) {
      this.paperBurn.apply(presentation.paperBurn, presentation.timeMs)
      this.paperAperture?.apply(
        presentation.paperBurn,
        presentation.timeMs,
      )
      return
    }

    const activeKeys = new Set<string>()

    for (const burn of presentation.burns) {
      const key = `${burn.row}:${burn.column}`
      activeKeys.add(key)
      let attachment = this.burns.get(key)
      if (!attachment) {
        const tile = this.board.cellAt(burn.row, burn.column)
        if (!tile) continue
        attachment = new TileBurnAttachment(tile, burn.seed)
        this.burns.set(key, attachment)
      }
      attachment.apply(burn, presentation.timeMs)
    }

    for (const [key, attachment] of this.burns) {
      if (activeKeys.has(key)) continue
      attachment.destroy()
      this.burns.delete(key)
    }
  }

  destroy(): void {
    for (const burn of this.burns.values()) burn.destroy()
    this.burns.clear()
    this.paperBurn?.destroy()
    this.paperAperture?.destroy()
    this.lens.destroy()
    this.debugControls?.destroy()
  }
}
