import Phaser from "phaser"
import { FADING_INK_CONFIG } from "../../modes/fadingInkConfig"
import { GAME_STYLE } from "../../style/gameStyle"
import type { FadeStartMarkerPresentationModel } from "../model/PresentationModel"

export class FadeStartMarkerLayer {
  private readonly markers = new Map<number, Phaser.GameObjects.Container>()

  constructor(private readonly scene: Phaser.Scene) {}

  apply(presentation: readonly FadeStartMarkerPresentationModel[]): void {
    const visibleRows = new Set(presentation.map((marker) => marker.row))

    for (const [row, marker] of this.markers) {
      if (!visibleRows.has(row)) {
        marker.destroy(true)
        this.markers.delete(row)
      }
    }

    for (const markerPresentation of presentation) {
      const marker =
        this.markers.get(markerPresentation.row) ??
        this.create(markerPresentation.row)
      marker.setPosition(markerPresentation.x, markerPresentation.y)
      marker.setVisible(markerPresentation.visible)
    }
  }

  destroy(): void {
    for (const marker of this.markers.values()) marker.destroy(true)
    this.markers.clear()
  }

  private create(row: number): Phaser.GameObjects.Container {
    const config = FADING_INK_CONFIG.debugFadeStartMarker
    const eye = this.scene.add.graphics()

    eye.lineStyle(config.lineWidth, GAME_STYLE.color.mutedInk, config.alpha)
    eye.strokeEllipse(0, 0, config.width, config.height)
    eye.fillStyle(GAME_STYLE.color.mutedInk, config.alpha)
    eye.fillCircle(0, 0, config.pupilRadius)

    const marker = this.scene.add
      .container(0, 0, [eye])
      .setVisible(false)
    this.markers.set(row, marker)
    return marker
  }
}
