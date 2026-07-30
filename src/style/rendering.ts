import Phaser from "phaser"
import { GAME_LAYOUT } from "./layout"

const MIN_RENDER_SCALE = 1
const MAX_RENDER_SCALE = 2

export const RENDER_SCALE = Phaser.Math.Clamp(
  window.devicePixelRatio || MIN_RENDER_SCALE,
  MIN_RENDER_SCALE,
  MAX_RENDER_SCALE,
)

export const RENDER_SIZE = {
  width: Math.round(GAME_LAYOUT.width * RENDER_SCALE),
  height: Math.round(GAME_LAYOUT.height * RENDER_SCALE),
} as const

export function configureLogicalCamera(scene: Phaser.Scene): void {
  scene.cameras.main
    .setZoom(RENDER_SCALE)
    .centerOn(GAME_LAYOUT.width / 2, GAME_LAYOUT.height / 2)
}
