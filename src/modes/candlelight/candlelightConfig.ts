type FivePhaseProfile = readonly [
  number,
  number,
  number,
  number,
  number,
]

export interface CandlelightBurnProfile {
  readonly sourceCenterWiggleAmplitude: FivePhaseProfile
  readonly sourceCenterWiggleTimeScale: FivePhaseProfile
  readonly sourceRadiusBaseline: FivePhaseProfile
  readonly sourceRadiusWiggleAmplitude: FivePhaseProfile
  readonly sourceRadiusWiggleTimeScale: FivePhaseProfile
  readonly sourceBrightnessBaseline: FivePhaseProfile
  readonly sourceBrightnessWiggleAmplitude: FivePhaseProfile
  readonly sourceBrightnessWiggleTimeScale: FivePhaseProfile
  readonly sourceFastFlickerAmplitude: FivePhaseProfile
  readonly sourceFastFlickerTimeScale: FivePhaseProfile
  readonly radiusBrightnessNoiseCorrelation: FivePhaseProfile
  readonly warmth: FivePhaseProfile
  readonly sourceColorWiggleAmplitude: FivePhaseProfile
  readonly sourceColorWiggleTimeScale: FivePhaseProfile
  readonly smokeAmount: FivePhaseProfile
  readonly smokeSputter: FivePhaseProfile
}

export const CANDLELIGHT_CONFIG = {
  burnDurationMs: 120_000,
  sourceCenterBaseline: [0.1, 1.02] as const,
  phaseEnds: [0.25, 0.75, 0.95, 1] as const,
  extinctionStartsAt: 0.995,
  burnProfile: {
    sourceCenterWiggleAmplitude: [
      0.008, 0.01, 0.014, 0.025, 0.03,
    ],
    sourceCenterWiggleTimeScale: [
      0.3, 0.4, 0.65, 1.6, 0.22,
    ],
    sourceRadiusBaseline: [0.61, 0.58, 0.45, 0.38, 0.38],
    sourceRadiusWiggleAmplitude: [
      0.015, 0.025, 0.045, 0.1, 0.75,
    ],
    sourceRadiusWiggleTimeScale: [
      0.25, 0.4, 0.8, 2, 2,
    ],
    sourceBrightnessBaseline: [1, 0.95, 0.72, 0.42, 0.34],
    sourceBrightnessWiggleAmplitude: [
      0.04, 0.065, 0.12, 0.32, 1.1,
    ],
    sourceBrightnessWiggleTimeScale: [
      0.18, 0.35, 0.85, 2.4, 2,
    ],
    sourceFastFlickerAmplitude: [
      0.015, 0.02, 0.03, 0.06, 0.28,
    ],
    sourceFastFlickerTimeScale: [
      0.1, 0.12, 0.14, 0.2, 0.11,
    ],
    radiusBrightnessNoiseCorrelation: [0, 0.03, 0.1, 0.35, 0.9],
    warmth: [0.03, 0.14, 0.42, 0.86, 1],
    sourceColorWiggleAmplitude: [
      0.015, 0.02, 0.025, 0.05, 0.08,
    ],
    sourceColorWiggleTimeScale: [
      0.45, 0.6, 0.9, 1.8, 0.3,
    ],
    smokeAmount: [0.015, 0.04, 0.28, 0.9, 1],
    smokeSputter: [0, 0.02, 0.18, 0.7, 1],
  } satisfies CandlelightBurnProfile,
  color: {
    glowCool: [1, 0.58, 0.22] as const,
    glowWarm: [1, 0.23, 0.035] as const,
    initialOverlayAlpha: 0.012,
    finalOverlayAlpha: 0.3,
  },
  smoke: {
    color: [0.08, 0.38, 1] as const,
    maximumOverlayAlpha: 0.075,
    plumeHeight: 0.68,
    baseWidth: 0.018,
    topWidth: 0.075,
    drift: 0.048,
    turbulence: 0.026,
    riseSpeed: 0.12,
  },
  darkness: 1,
  darkDesaturation: 0.86,
  darkBlurPixels: 1.5,
  darkBlurQuality: 0,
  darkBlurSteps: 1,
  darkBlurStrength: 0.7,
  fallbackInitialShadeAlpha: 0.42,
} as const
