import Phaser from "phaser"
import type { LetterResult } from "../core/evaluateGuess"
import { GAME_LAYOUT, boardWidth } from "../style/layout"
import { GAME_MOTION } from "../style/motion"
import { choosePigmentTextureFrames } from "./pigmentTextures"
import { TileView } from "./TileView"

interface RevealRowOptions {
  word?: string
  letterLegibleProgress?: number
  onLetterLegible?(column: number): void
}

export class BoardView {
  private readonly rows: TileView[][] = []

  constructor(scene: Phaser.Scene) {
    const startX = (GAME_LAYOUT.width - boardWidth()) / 2 + GAME_LAYOUT.board.tileSize / 2
    const startY = GAME_LAYOUT.board.top + GAME_LAYOUT.board.tileSize / 2
    const step = GAME_LAYOUT.board.tileSize + GAME_LAYOUT.board.gap
    const pigmentFrames = choosePigmentTextureFrames(
      GAME_LAYOUT.board.rows * GAME_LAYOUT.board.columns,
    )
    let tileIndex = 0

    for (let row = 0; row < GAME_LAYOUT.board.rows; row += 1) {
      const tiles: TileView[] = []
      for (let column = 0; column < GAME_LAYOUT.board.columns; column += 1) {
        tiles.push(
          new TileView(
            scene,
            startX + column * step,
            startY + row * step,
            pigmentFrames[tileIndex++]!,
          ),
        )
      }
      this.rows.push(tiles)
    }
  }

  renderCurrentGuess(
    row: number,
    guess: string,
    animateLastLetter = true,
  ): void {
    const tiles = this.rows[row]
    if (!tiles) return

    tiles.forEach((tile, column) => {
      tile.setLetter(
        guess[column] ?? "",
        animateLastLetter && column === guess.length - 1,
      )
    })
  }

  revealRow(
    row: number,
    evaluation: LetterResult[],
    options: RevealRowOptions = {},
  ): void {
    const tiles = this.rows[row]
    if (!tiles) return

    tiles.forEach((tile, column) => {
      const result = evaluation[column]
      if (result) {
        tile.reveal(
          result,
          column * GAME_MOTION.tile.revealStagger,
          options.word?.[column],
          options.onLetterLegible
            ? () => options.onLetterLegible?.(column)
            : undefined,
          options.letterLegibleProgress,
        )
      }
    })
  }

  setLetterInkAlpha(row: number, column: number, alpha: number): void {
    this.rows[row]?.[column]?.setLetterInkAlpha(alpha)
  }

  restoreRowInk(row: number): void {
    this.rows[row]?.forEach((tile) => tile.setLetterInkAlpha(1))
  }

  tileAt(row: number, column: number): TileView | undefined {
    return this.rows[row]?.[column]
  }

  tiles(): readonly TileView[] {
    return this.rows.flat()
  }

}
