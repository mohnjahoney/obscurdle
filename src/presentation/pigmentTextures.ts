import Phaser from "phaser"
import pigmentAtlasUrl from "../assets/expressive-pigment-atlas.png?url"

export const PIGMENT_TEXTURE_KEY = "expressive-pigment"
export const PIGMENT_TEXTURE_COUNT = 100
export const PIGMENT_TEXTURE_FRAME_SIZE = 128

type RandomSource = () => number

export function preloadPigmentTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(PIGMENT_TEXTURE_KEY)) return

  scene.load.spritesheet(PIGMENT_TEXTURE_KEY, pigmentAtlasUrl, {
    frameWidth: PIGMENT_TEXTURE_FRAME_SIZE,
    frameHeight: PIGMENT_TEXTURE_FRAME_SIZE,
  })
}

export function choosePigmentTextureFrames(
  count: number,
  random: RandomSource = Math.random,
): number[] {
  if (count > PIGMENT_TEXTURE_COUNT) {
    throw new RangeError(
      `Cannot choose ${count} unique pigment textures from ${PIGMENT_TEXTURE_COUNT}`,
    )
  }

  const frames = Array.from(
    { length: PIGMENT_TEXTURE_COUNT },
    (_, frame) => frame,
  )

  for (let index = frames.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = frames[index]
    frames[index] = frames[swapIndex]!
    frames[swapIndex] = current!
  }

  return frames.slice(0, count)
}
