export const FADING_INK_CONFIG = {
  gracePeriodMs: 6_000,
  letterStartJitterMaxMs: 0,
  // The fade timer is independent of the ink-bloom reveal animation. A
  // submitted row begins fading after the grace period even if its reveal is
  // still running, and then takes roughly 30 seconds to disappear.
  fadeDurationMs: 30_000,
  debugFadeStartMarker: {
    enabled: false,
    offsetFromBoard: 18,
    width: 16,
    height: 9,
    lineWidth: 1.5,
    pupilRadius: 2,
    alpha: 0.78,
  },
} as const
