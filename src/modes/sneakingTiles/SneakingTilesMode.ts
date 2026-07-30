import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import { GAME_LAYOUT } from "../../style/layout"
import { GAME_MOTION } from "../../style/motion"
import { SneakingTileActor } from "./SneakingTileActor"
import { chooseSneakingColumn } from "./sneakingTileSelection"
import { SNEAKING_TILES_CONFIG } from "./sneakingTilesConfig"

function randomBetween(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum)
}

export class SneakingTilesMode implements ObscuringMode {
  private readonly actors: SneakingTileActor[] = []
  private previousChosenColumns = new Set<number>()

  start(_context: ModeContext): void {
    this.previousChosenColumns.clear()
  }

  onGuessSubmitted(context: ModeContext, row: number): void {
    const chosenColumns = new Set<number>()

    while (
      chosenColumns.size <
      Math.min(
        SNEAKING_TILES_CONFIG.tilesPerSubmittedWord,
        GAME_LAYOUT.board.columns,
      )
    ) {
      chosenColumns.add(
        chooseSneakingColumn(
          GAME_LAYOUT.board.columns,
          SNEAKING_TILES_CONFIG.selection,
          Math.random,
          this.previousChosenColumns,
        ),
      )
    }

    this.previousChosenColumns = new Set(chosenColumns)

    for (const column of chosenColumns) {
      const tile = context.board.tileAt(row, column)
      if (!tile) continue

      const actor = new SneakingTileActor(context.scene, tile)
      this.actors.push(actor)
      const revealFinishesAfter =
        GAME_MOTION.tile.inkBloom.duration +
        column * GAME_MOTION.tile.revealStagger
      const hesitation = randomBetween(
        SNEAKING_TILES_CONFIG.hesitationMs.minimum,
        SNEAKING_TILES_CONFIG.hesitationMs.maximum,
      )
      actor.start(revealFinishesAfter + hesitation)
    }
  }

  update(_context: ModeContext): void {}

  stop(_context: ModeContext): void {
    for (const actor of this.actors) {
      actor.stop()
    }
    this.actors.length = 0
    this.previousChosenColumns.clear()
  }
}
