import { GAME_LAYOUT, boardWidth } from "../../style/layout"

const boardLeft = (GAME_LAYOUT.width - boardWidth()) / 2
const boardBottom =
  GAME_LAYOUT.board.top +
  (GAME_LAYOUT.board.rows - 1) *
    (GAME_LAYOUT.board.tileSize + GAME_LAYOUT.board.gap) +
  GAME_LAYOUT.board.tileSize / 2

export const MAGNIFYING_GLASS_CONTROL = {
  burnRate: "burnRate",
  automaticMotion: "automaticMotion",
} as const

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
    entrance: {
      delayAfterFirstSubmissionMs: 5_000,
      // 4.286s is 70% of the previous upward travel speed.
      durationMs: 3_000 / 0.7,
      start: {
        x: boardLeft + boardWidth() * 0.72,
        // Park the full rim just below the page; the first movement after
        // the delay immediately brings its upper edge into view.
        y: GAME_LAYOUT.height + 53,
      },
      target: {
        x: boardLeft + boardWidth() * 0.68,
        y: GAME_LAYOUT.board.top + GAME_LAYOUT.board.tileSize / 2,
      },
    },
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
    heatGainPerSecond: 1.8 * 0.7,
    brownStartsAt: 0.28,
    charStartsAt: 1.15,
    charFullyDevelopedAt: 2.8,
    perforationStartsAt: 2.35,
    openHoleAt: 2.85,
    maximumHeat: 3.4,
    redrawIntervalMs: 80,
    brownColor: 0x9a622f,
    deepBrownColor: 0x5d321b,
    charColor: 0x211a15,
    maximumBrownAlpha: 0.34,
    maximumCharAlpha: 0.92,
    paperSurface: {
      left: GAME_LAYOUT.page.inset,
      right: GAME_LAYOUT.width - GAME_LAYOUT.page.inset,
      top: GAME_LAYOUT.board.top - GAME_LAYOUT.board.tileSize / 2,
      bottom: boardBottom,
      heatCellSize: 5,
      textureScale: 2,
      // The paper scorch must sit above the printed ink so sufficiently
      // burned regions obscure letters, while remaining below the lens.
      depth: 10,
      seed: 2_741,
    },
    aperture: {
      depth: 11,
      charRimColor: 0x17100c,
      paperEdgeHighlight: 0xfff8e7,
      paperEdgeShadow: 0x765039,
      // Temporary surface visible through fully burned paper. Keeping this
      // here makes the eventual scene/background replacement independent of
      // the heat and aperture models.
      backingColor: 0x000000,
      backingShadowColor: 0x000000,
      lightDirection: { x: -0.55, y: -0.84 },
    },
    mark: {
      positionJitter: 0.42,
      minimumRadiusInCells: 0.5,
      maximumRadiusInCells: 2,
      centerOpacityRatio: 0.5,
      middleOpacityRatio: 0.7,
      darkEdgeStart: 0.82,
    },
    debugRateControl: {
      enabled: false,
      minimum: 0.2,
      maximum: 5,
      step: 0.1,
      automaticMotionInitiallyEnabled: true,
    },
  },
} as const
