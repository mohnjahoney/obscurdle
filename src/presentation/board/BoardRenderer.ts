import Phaser from "phaser"
import { GAME_LAYOUT } from "../../style/layout"
import { GAME_MOTION } from "../../style/motion"
import type {
  BoardPresentationModel,
  LetterCellPresentationModel,
} from "../model/PresentationModel"
import { choosePigmentTextureFrames } from "../pigmentTextures"
import type { BoardPresentationId } from "./BoardPresentation"
import { FadeStartMarkerLayer } from "./FadeStartMarkerLayer"
import { EditorialAnnotationLayer } from "./EditorialAnnotationLayer"
import { LetterCell } from "./LetterCell"

interface BoardRendererHandlers {
  onLetterLegible?(row: number, column: number): void
}

export class BoardRenderer {
  private readonly rows: LetterCell[][] = []
  private readonly fadeStartMarkers: FadeStartMarkerLayer
  private readonly editorialAnnotations: EditorialAnnotationLayer
  private previousPresentation?: BoardPresentationModel

  constructor(
    scene: Phaser.Scene,
    readonly presentation: BoardPresentationId,
    private readonly handlers: BoardRendererHandlers = {},
  ) {
    this.fadeStartMarkers = new FadeStartMarkerLayer(scene)
    const pigmentFrames = choosePigmentTextureFrames(
      GAME_LAYOUT.board.rows * GAME_LAYOUT.board.columns,
    )
    let cellIndex = 0

    for (let row = 0; row < GAME_LAYOUT.board.rows; row += 1) {
      const cells: LetterCell[] = []
      for (let column = 0; column < GAME_LAYOUT.board.columns; column += 1) {
        cells.push(
          new LetterCell(
            scene,
            0,
            0,
            pigmentFrames[cellIndex++]!,
            presentation,
          ),
        )
      }
      this.rows.push(cells)
    }
    this.editorialAnnotations = new EditorialAnnotationLayer(scene, this.rows)
  }

  apply(presentation: BoardPresentationModel): void {
    if (presentation.kind !== this.presentation) {
      throw new Error(
        `Cannot apply ${presentation.kind} board to ${this.presentation} renderer`,
      )
    }

    this.rows.forEach((cells, row) => {
      cells.forEach((cell, column) => {
        const previous = this.previousPresentation?.rows[row]?.[column]
        const next = presentation.rows[row]?.[column] ?? EMPTY_CELL
        const previousInkAlpha = previous?.inkAlpha ?? 1
        const nextInkAlpha = next.inkAlpha ?? 1
        const previousOffsetX = previous?.offsetX ?? 0
        const nextOffsetX = next.offsetX ?? 0
        const previousDepthOffset = previous?.depthOffset ?? 0
        const nextDepthOffset = next.depthOffset ?? 0

        if (
          !previous ||
          previous.baseX !== next.baseX ||
          previous.baseY !== next.baseY
        ) {
          cell.setBasePlacement(next.baseX, next.baseY)
        }

        if (previousInkAlpha !== nextInkAlpha) {
          cell.setLetterInkAlpha(nextInkAlpha)
        }
        if (
          previousOffsetX !== nextOffsetX ||
          previousDepthOffset !== nextDepthOffset
        ) {
          cell.setPresentationTransform(nextOffsetX, nextDepthOffset)
        }

        if (next.evaluation) {
          if (previous && !previous.evaluation) {
            cell.reveal(
              next.evaluation,
              column * GAME_MOTION.tile.revealStagger,
              next.letter,
              next.reportLetterLegible
                ? () => this.handlers.onLetterLegible?.(row, column)
                : undefined,
              next.letterLegibleProgress,
            )
          } else if (
            !previous ||
            previous.letter !== next.letter ||
            previous.evaluation !== next.evaluation
          ) {
            cell.setEvaluatedLetter(next.letter, next.evaluation)
          }
          return
        }

        if (!previous || previous.letter !== next.letter || previous.evaluation) {
          const isNewLetter = Boolean(previous && !previous.letter && next.letter)
          cell.setLetter(next.letter, isNewLetter)
        }
      })
    })

    this.editorialAnnotations.apply(presentation, this.previousPresentation)
    this.fadeStartMarkers.apply(presentation.fadeStartMarkers)
    this.previousPresentation = presentation
  }

  cellAt(row: number, column: number): LetterCell | undefined {
    return this.rows[row]?.[column]
  }

  cells(): readonly LetterCell[] {
    return this.rows.flat()
  }

  destroy(): void {
    for (const cell of this.cells()) cell.destroy(true)
    this.rows.length = 0
    this.fadeStartMarkers.destroy()
    this.editorialAnnotations.destroy()
    this.previousPresentation = undefined
  }
}

const EMPTY_CELL: LetterCellPresentationModel = {
  letter: "",
  baseX: 0,
  baseY: 0,
}
