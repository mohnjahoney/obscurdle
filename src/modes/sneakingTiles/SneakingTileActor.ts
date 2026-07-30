import Phaser from "phaser"
import type { TileView } from "../../presentation/TileView"
import { GAME_LAYOUT } from "../../style/layout"
import { SNEAKING_TILES_CONFIG } from "./sneakingTilesConfig"

function randomBetween(minimum: number, maximum: number): number {
  return Phaser.Math.FloatBetween(minimum, maximum)
}

export class SneakingTileActor {
  private readonly originalX: number
  private readonly originalY: number
  private readonly originalDepth: number
  private readonly destinationX: number
  private timer?: Phaser.Time.TimerEvent
  private stopped = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tile: TileView,
  ) {
    this.originalX = tile.x
    this.originalY = tile.y
    this.originalDepth = tile.depth
    const escapeLeft =
      tile.x < GAME_LAYOUT.width / 2 ||
      (tile.x === GAME_LAYOUT.width / 2 && Math.random() < 0.5)
    this.destinationX = escapeLeft
      ? -SNEAKING_TILES_CONFIG.offscreenMargin
      : GAME_LAYOUT.width + SNEAKING_TILES_CONFIG.offscreenMargin
  }

  start(delayMs: number): void {
    this.schedule(delayMs, () => this.creep())
  }

  stop(): void {
    this.stopped = true
    this.timer?.remove()
    this.scene.tweens.killTweensOf(this.tile)
    this.tile.setPosition(this.originalX, this.originalY)
    this.tile.setDepth(this.originalDepth)
  }

  private creep(): void {
    if (this.stopped) return
    this.tile.setDepth(this.originalDepth - 1)

    const remaining = Math.abs(this.destinationX - this.tile.x)
    if (remaining < 0.5) return

    const direction = Math.sign(this.destinationX - this.tile.x)
    const distance = Math.min(
      remaining,
      randomBetween(
        SNEAKING_TILES_CONFIG.creep.minimumDistance,
        SNEAKING_TILES_CONFIG.creep.maximumDistance,
      ),
    )
    const duration = randomBetween(
      SNEAKING_TILES_CONFIG.creep.minimumDurationMs,
      SNEAKING_TILES_CONFIG.creep.maximumDurationMs,
    )
    this.scene.tweens.add({
      targets: this.tile,
      x: this.tile.x + direction * distance,
      duration,
      ease: "Sine.InOut",
      onComplete: () => {
        if (Math.abs(this.destinationX - this.tile.x) < 0.5) return

        this.schedule(
          randomBetween(
            SNEAKING_TILES_CONFIG.pauseMs.minimum,
            SNEAKING_TILES_CONFIG.pauseMs.maximum,
          ),
          () => this.creep(),
        )
      },
    })
  }

  private schedule(delayMs: number, callback: () => void): void {
    this.timer = this.scene.time.delayedCall(delayMs, callback)
  }
}
