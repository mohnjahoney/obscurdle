export const FADING_INK_CONFIG = {
  gracePeriodMs: 6_000,
  letterStartJitterMaxMs: 0,
  fadeDurationMs: 10_000,
  debugFadeStartMarker: {
    enabled: true,
    offsetFromBoard: 18,
    width: 16,
    height: 9,
    lineWidth: 1.5,
    pupilRadius: 2,
    alpha: 0.78,
  },
} as const
