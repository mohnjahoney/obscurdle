import Phaser from "phaser"
import { GAME_STYLE } from "../../style/gameStyle"
import { GAME_MOTION } from "../../style/motion"
import type { BoardPresentationModel } from "../model/PresentationModel"
import {
  findEditorialAnnotationRuns,
  type EditorialAnnotationRun,
} from "./editorialEvaluation"
import type { LetterCell } from "./LetterCell"

interface RenderedMark {
  container: Phaser.GameObjects.Container
}

interface Point {
  x: number
  y: number
}

function variation(seed: number, sample: number): number {
  const value = Math.sin(seed * 127.1 + sample * 311.7) * 43_758.5453
  return (value - Math.floor(value)) * 2 - 1
}

function runKey(row: number, run: EditorialAnnotationRun): string {
  return `${row}:${run.result}:${run.startColumn}:${run.endColumn}`
}

export class EditorialAnnotationLayer {
  private readonly marks = new Map<string, RenderedMark>()

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rows: readonly (readonly LetterCell[])[],
  ) {}

  apply(
    presentation: BoardPresentationModel,
    previous?: BoardPresentationModel,
  ): void {
    if (presentation.kind !== "bare") {
      this.clear()
      return
    }

    const activeKeys = new Set<string>()
    presentation.rows.forEach((row, rowIndex) => {
      for (const run of findEditorialAnnotationRuns(row)) {
        const key = runKey(rowIndex, run)
        activeKeys.add(key)
        if (this.marks.has(key)) continue

        const mark = this.createMark(rowIndex, run)
        if (!mark) continue
        this.marks.set(key, mark)

        if (this.isNewEvaluation(previous, rowIndex, run)) {
          this.animateMark(mark.container, run)
        }
      }
    })

    for (const [key, mark] of this.marks) {
      if (activeKeys.has(key)) continue
      this.scene.tweens.killTweensOf(mark.container)
      mark.container.destroy(true)
      this.marks.delete(key)
    }
  }

  destroy(): void {
    this.clear()
  }

  private createMark(
    row: number,
    run: EditorialAnnotationRun,
  ): RenderedMark | undefined {
    const first = this.rows[row]?.[run.startColumn]?.editorialBounds()
    const last = this.rows[row]?.[run.endColumn]?.editorialBounds()
    if (!first || !last) return undefined

    const style =
      run.result === "absent"
        ? GAME_STYLE.editorial.strike
        : GAME_STYLE.editorial.highlight
    const startX = first.left - style.overshoot
    const endX = last.right + style.overshoot
    const width = Math.max(1, endX - startX)
    const endY = last.centerY - first.centerY
    const seed = row * 97 + run.startColumn * 17 + run.endColumn * 31
    const graphics = this.scene.add.graphics()

    if (run.result === "absent") {
      this.drawStrike(graphics, width, endY, seed)
    } else {
      this.drawHighlight(graphics, width, endY, seed)
    }

    const container = this.scene.add.container(startX, first.centerY, [graphics])
    return { container }
  }

  private drawStrike(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    endY: number,
    seed: number,
  ): void {
    const style = GAME_STYLE.editorial.strike
    const samples = Math.max(5, Math.ceil(width / 9))
    const points = Array.from({ length: samples + 1 }, (_, index) => {
      const progress = index / samples
      return {
        x: progress * width,
        y:
          progress * endY +
          variation(seed, index) * style.wobble *
            Math.sin(progress * Math.PI),
      }
    })

    this.strokePath(graphics, points, style.lineWidth + 1.2, style.color, 0.12)
    this.strokePath(graphics, points, style.lineWidth, style.color, style.alpha)
  }

  private drawHighlight(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    endY: number,
    seed: number,
  ): void {
    const style = GAME_STYLE.editorial.highlight
    const samples = Math.max(8, Math.ceil(width / 6))
    const halfHeight = style.height / 2
    const top: Point[] = []
    const bottom: Point[] = []

    for (let index = 0; index <= samples; index += 1) {
      const progress = index / samples
      const x = progress * width
      const centerY = progress * endY
      const feather =
        x > width - style.endFeatherLength
          ? Math.max(0.18, (width - x) / style.endFeatherLength)
          : 1
      top.push({
        x,
        y:
          centerY -
          halfHeight * feather +
          variation(seed + 11, index) * style.edgeVariation,
      })
      bottom.push({
        x,
        y:
          centerY +
          halfHeight * feather +
          variation(seed + 29, index) * style.edgeVariation,
      })
    }

    graphics
      .fillStyle(style.color, style.alpha)
      .fillPoints(
        [...top, ...bottom.reverse()].map(
          (point) => new Phaser.Math.Vector2(point.x, point.y),
        ),
        true,
      )
      .fillStyle(style.color, style.startDwellAlpha)
      .fillRoundedRect(
        0,
        -halfHeight - 1,
        style.startDwellWidth,
        style.height + 2,
        2,
      )

    for (let streak = -1; streak <= 1; streak += 1) {
      const y = streak * 4 + variation(seed + 47, streak + 2) * 1.2
      graphics
        .lineStyle(style.streakWidth, style.color, style.streakAlpha)
        .beginPath()
        .moveTo(style.startDwellWidth * 0.6, y)
        .lineTo(
          width - style.endFeatherLength * (0.25 + (streak + 1) * 0.18),
          endY + y,
        )
        .strokePath()
    }
  }

  private strokePath(
    graphics: Phaser.GameObjects.Graphics,
    points: readonly Point[],
    width: number,
    color: number,
    alpha: number,
  ): void {
    const first = points[0]
    if (!first) return

    graphics.lineStyle(width, color, alpha).beginPath().moveTo(first.x, first.y)
    for (const point of points.slice(1)) graphics.lineTo(point.x, point.y)
    graphics.strokePath()
  }

  private isNewEvaluation(
    previous: BoardPresentationModel | undefined,
    row: number,
    run: EditorialAnnotationRun,
  ): boolean {
    if (!previous || previous.kind !== "bare") return false
    for (let column = run.startColumn; column <= run.endColumn; column += 1) {
      if (!previous.rows[row]?.[column]?.evaluation) return true
    }
    return false
  }

  private animateMark(
    container: Phaser.GameObjects.Container,
    run: EditorialAnnotationRun,
  ): void {
    container.setScale(0.001, 1)
    this.scene.tweens.add({
      targets: container,
      scaleX: 1,
      duration:
        run.result === "absent"
          ? GAME_MOTION.editorial.strikeDuration
          : GAME_MOTION.editorial.highlightDuration,
      delay: run.startColumn * GAME_MOTION.tile.revealStagger,
      ease: "Sine.Out",
    })
  }

  private clear(): void {
    for (const mark of this.marks.values()) {
      this.scene.tweens.killTweensOf(mark.container)
      mark.container.destroy(true)
    }
    this.marks.clear()
  }
}
