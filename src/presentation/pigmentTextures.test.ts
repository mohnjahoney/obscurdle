import { describe, expect, it } from "vitest"
import {
  choosePigmentTextureFrames,
  PIGMENT_TEXTURE_COUNT,
} from "./pigmentTextures"

describe("pigment texture selection", () => {
  it("chooses the requested number without replacement", () => {
    const frames = choosePigmentTextureFrames(30, () => 0.37)

    expect(frames).toHaveLength(30)
    expect(new Set(frames)).toHaveLength(30)
    expect(frames.every((frame) => frame >= 0 && frame < 100)).toBe(true)
  })

  it("refuses to choose more frames than the atlas contains", () => {
    expect(() =>
      choosePigmentTextureFrames(PIGMENT_TEXTURE_COUNT + 1),
    ).toThrow(RangeError)
  })
})
