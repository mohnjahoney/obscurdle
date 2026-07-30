export type SneakingTileSelection = "random" | "outer"

export const SNEAKING_TILES_CONFIG = {
  selection: "random" as SneakingTileSelection,
  tilesPerSubmittedWord: 1,
  hesitationMs: {
    minimum: 2_800,
    maximum: 5_800,
  },
  creep: {
    minimumDistance: 8,
    maximumDistance: 16,
    minimumDurationMs: 2_800,
    maximumDurationMs: 5_000,
  },
  pauseMs: {
    minimum: 1_200,
    maximum: 3_600,
  },
  offscreenMargin: 32,
} as const
