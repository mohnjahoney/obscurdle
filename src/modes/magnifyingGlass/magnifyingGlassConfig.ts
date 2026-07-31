import { GAME_LAYOUT, boardWidth } from "../../style/layout"

const boardLeft = (GAME_LAYOUT.width - boardWidth()) / 2

export const MAGNIFYING_GLASS_CONFIG = {
  lens: {
    magnificationEnabled: false,
    radius: 48,
    magnification: 1.14,
    rimWidth: 5,
    rimColor: 0x6f5a35,
    rimHighlightColor: 0xc4aa72,
    glassColor: 0xdde8e3,
    glassAlpha: 0.08,
    shadowColor: 0x211f1a,
    shadowAlpha: 0.11,
    handleAngleDegrees: 38,
    handleLength: 76,
    handleWidth: 11,
  },
  focalSpot: {
    radius: 11,
    visualRadius: 14,
    intensity: 1,
    color: 0xffd27a,
  },
  motion: {
    bounds: {
      left: boardLeft + 12,
      right: boardLeft + boardWidth() - 12,
      top: GAME_LAYOUT.board.top + 12,
    },
    minimumSpeed: 13,
    maximumSpeed: 22,
    minimumTargetDistance: 42,
    maximumTargetDistance: 118,
    minimumPauseMs: 350,
    maximumPauseMs: 1_450,
  },
  burn: {
    gridSize: 14,
    textureSize: 100,
    heatGainPerSecond: 1.8,
    brownStartsAt: 0.28,
    charStartsAt: 1.15,
    maximumHeat: 2.8,
    redrawIntervalMs: 80,
    brownColor: 0x9a622f,
    deepBrownColor: 0x5d321b,
    charColor: 0x211a15,
    maximumBrownAlpha: 0.34,
    maximumCharAlpha: 0.92,
    mark: {
      positionJitter: 0.42,
      minimumRadiusInCells: 0.5,
      maximumRadiusInCells: 2,
      centerOpacityRatio: 0.5,
      middleOpacityRatio: 0.7,
      darkEdgeStart: 0.82,
    },
    debugRateControl: {
      enabled: true,
      minimum: 0.2,
      maximum: 5,
      step: 0.1,
      automaticMotionInitiallyEnabled: true,
    },
  },
} as const
