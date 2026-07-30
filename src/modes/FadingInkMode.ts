import Phaser from "phaser"
import { GAME_STYLE } from "../style/gameStyle"
import { GAME_LAYOUT, boardWidth } from "../style/layout"
import type { ModeContext, ObscuringMode } from "./ObscuringMode"
import { FADING_INK_CONFIG } from "./fadingInkConfig"
import {
  createRowFadeSchedule,
  letterInkAlphaAt,
  rowFadeStartsAt,
  type RowFadeSchedule,
} from "./fadingInkSchedule"

export class FadingInkMode implements ObscuringMode {
  private readonly schedules = new Map<number, RowFadeSchedule>()
  private readonly fadeStartMarkers = new Map<
    number,
    Phaser.GameObjects.Container
  >()

  start(): void {
    this.schedules.clear()
    this.destroyFadeStartMarkers()
  }

  onGuessSubmitted(context: ModeContext, row: number): void {
    const schedule = createRowFadeSchedule(
      context.scene.time.now,
      GAME_LAYOUT.board.columns,
    )
    this.schedules.set(row, schedule)

    if (FADING_INK_CONFIG.debugFadeStartMarker.enabled) {
      this.fadeStartMarkers.set(
        row,
        this.createFadeStartMarker(context.scene, row),
      )
    }
  }

  update(context: ModeContext): void {
    const now = context.scene.time.now

    for (const [row, schedule] of this.schedules) {
      const marker = this.fadeStartMarkers.get(row)
      if (marker && !marker.visible && now >= rowFadeStartsAt(schedule)) {
        marker.setVisible(true)
      }

      schedule.letterStartDelaysMs.forEach((_delay, column) => {
        context.board.setLetterInkAlpha(
          row,
          column,
          letterInkAlphaAt(schedule, column, now),
        )
      })
    }
  }

  stop(context: ModeContext): void {
    for (const row of this.schedules.keys()) {
      context.board.restoreRowInk(row)
    }
    this.schedules.clear()
    this.destroyFadeStartMarkers()
  }

  private createFadeStartMarker(
    scene: Phaser.Scene,
    row: number,
  ): Phaser.GameObjects.Container {
    const config = FADING_INK_CONFIG.debugFadeStartMarker
    const boardRight = GAME_LAYOUT.width / 2 + boardWidth() / 2
    const rowY =
      GAME_LAYOUT.board.top +
      GAME_LAYOUT.board.tileSize / 2 +
      row * (GAME_LAYOUT.board.tileSize + GAME_LAYOUT.board.gap)
    const eye = scene.add.graphics()

    eye.lineStyle(
      config.lineWidth,
      GAME_STYLE.color.mutedInk,
      config.alpha,
    )
    eye.strokeEllipse(0, 0, config.width, config.height)
    eye.fillStyle(GAME_STYLE.color.mutedInk, config.alpha)
    eye.fillCircle(0, 0, config.pupilRadius)

    return scene.add
      .container(boardRight + config.offsetFromBoard, rowY, [eye])
      .setVisible(false)
  }

  private destroyFadeStartMarkers(): void {
    for (const marker of this.fadeStartMarkers.values()) {
      marker.destroy(true)
    }
    this.fadeStartMarkers.clear()
  }
}
