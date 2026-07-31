import { GAME_STYLE } from "./gameStyle"

export const VINTAGE_TYPEWRITER_KEYBOARD_STYLE = {
  letterKey: {
    outerDiameter: 36,
    innerRingDiameter: 31,
    faceDiameter: 27,
  },
  functionKey: {
    outerHeight: 36,
    innerInset: 3,
    faceInset: 6,
  },
  shadowOffsetY: 2.5,
  ring: {
    outerStrokeWidth: 1.25,
    innerStrokeWidth: 1,
    faceStrokeWidth: 1,
  },
  color: {
    shadow: 0x403b33,
    outerRing: 0x756e62,
    innerRing: 0xd4ccbc,
    face: GAME_STYLE.color.key,
    outerStroke: GAME_STYLE.color.ink,
    innerStroke: GAME_STYLE.color.paperLight,
    faceStroke: GAME_STYLE.color.rule,
  },
  alpha: {
    shadow: 0.34,
    outerStroke: 0.62,
    innerStroke: 0.78,
    faceStroke: 0.66,
  },
} as const
