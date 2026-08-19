import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import type {
  SneakingTileMotionPresentationState,
  SneakingTilesModePresentationState,
} from "../../presentation/model/ModePresentationState"
import { GAME_LAYOUT } from "../../style/layout"
import { chooseSneakingColumn } from "./sneakingTileSelection"
import {
  createSneakingTileMotion,
  sneakingMotionChangesBetween,
} from "./sneakingTileMotion"
import { SNEAKING_TILES_CONFIG } from "./sneakingTilesConfig"

export class SneakingTilesMode implements ObscuringMode {
  private readonly motions: SneakingTileMotionPresentationState[] = []
  private previousChosenColumns = new Set<number>()
  private lastUpdateAt = 0

  constructor(private readonly random: () => number = Math.random) {}

  start(context: ModeContext): void {
    this.motions.length = 0
    this.previousChosenColumns.clear()
    this.lastUpdateAt = context.scene.time.now
  }

  presentationState(): SneakingTilesModePresentationState {
    return {
      kind: "sneaking-tiles",
      motions: [...this.motions],
    }
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
          this.random,
          this.previousChosenColumns,
        ),
      )
    }

    this.previousChosenColumns = new Set(chosenColumns)

    for (const column of chosenColumns) {
      this.motions.push(
        createSneakingTileMotion(
          row,
          column,
          context.scene.time.now,
          this.random,
        ),
      )
    }
  }

  update(context: ModeContext): boolean {
    const now = context.scene.time.now
    const presentationChanged = this.motions.some((motion) =>
      sneakingMotionChangesBetween(motion, this.lastUpdateAt, now),
    )
    this.lastUpdateAt = now
    return presentationChanged
  }

  stop(): void {
    this.motions.length = 0
    this.previousChosenColumns.clear()
  }
}
