import type Phaser from "phaser"
import type { BoardRenderer } from "../board/BoardRenderer"
import type { SceneEffectPresentationModel } from "../model/PresentationModel"
import { CandlelightEffectRenderer } from "./CandlelightEffectRenderer"
import { FlashlightEffectRenderer } from "./FlashlightEffectRenderer"
import { MagnifyingGlassEffectRenderer } from "./MagnifyingGlassEffectRenderer"

interface SceneEffectRendererHandlers {
  onControlChange?(name: string, value: number): void
}

export class SceneEffectRenderer {
  private flashlight?: FlashlightEffectRenderer
  private candlelight?: CandlelightEffectRenderer
  private magnifyingGlass?: MagnifyingGlassEffectRenderer

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly board: BoardRenderer,
    private readonly handlers: SceneEffectRendererHandlers = {},
  ) {}

  apply(presentation: SceneEffectPresentationModel): void {
    if (presentation.kind === "none") {
      this.destroyFlashlight()
      this.destroyCandlelight()
      this.destroyMagnifyingGlass()
      return
    }

    if (presentation.kind === "flashlight") {
      this.destroyCandlelight()
      this.destroyMagnifyingGlass()
      if (
        !this.flashlight ||
        this.flashlight.distribution !== presentation.distribution
      ) {
        this.destroyFlashlight()
        this.flashlight = new FlashlightEffectRenderer(
          this.scene,
          presentation,
          this.handlers,
        )
      } else {
        this.flashlight.apply(presentation)
      }
      return
    }

    if (presentation.kind === "magnifying-glass") {
      this.destroyFlashlight()
      this.destroyCandlelight()
      if (!this.magnifyingGlass) {
        this.magnifyingGlass = new MagnifyingGlassEffectRenderer(
          this.scene,
          this.board,
          presentation,
          this.handlers,
        )
      } else {
        this.magnifyingGlass.apply(presentation)
      }
      return
    }

    this.destroyFlashlight()
    this.destroyMagnifyingGlass()
    if (!this.candlelight) {
      this.candlelight = new CandlelightEffectRenderer(
        this.scene,
        presentation,
      )
    } else {
      this.candlelight.apply(presentation)
    }
  }

  destroy(): void {
    this.destroyFlashlight()
    this.destroyCandlelight()
    this.destroyMagnifyingGlass()
  }

  private destroyFlashlight(): void {
    this.flashlight?.destroy()
    this.flashlight = undefined
  }

  private destroyCandlelight(): void {
    this.candlelight?.destroy()
    this.candlelight = undefined
  }

  private destroyMagnifyingGlass(): void {
    this.magnifyingGlass?.destroy()
    this.magnifyingGlass = undefined
  }
}
