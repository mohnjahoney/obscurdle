import {
  CANDLELIGHT_CONFIG,
  type CandlelightBurnProfile,
} from "./candlelightConfig"

export interface CandleBurnState {
  progress: number
  sourceCenterWiggleAmplitude: number
  sourceCenterWiggleTimeScale: number
  sourceRadiusBaseline: number
  sourceRadiusWiggleAmplitude: number
  sourceRadiusWiggleTimeScale: number
  sourceBrightnessBaseline: number
  sourceBrightnessWiggleAmplitude: number
  sourceBrightnessWiggleTimeScale: number
  sourceFastFlickerAmplitude: number
  sourceFastFlickerTimeScale: number
  radiusBrightnessNoiseCorrelation: number
  warmth: number
  sourceColorWiggleAmplitude: number
  sourceColorWiggleTimeScale: number
  smokeAmount: number
  smokeSputter: number
  extinction: number
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

function smootherStep(start: number, end: number, value: number): number {
  if (start === end) return value < start ? 0 : 1

  const amount = clamp01((value - start) / (end - start))
  return amount * amount * amount * (amount * (amount * 6 - 15) + 10)
}

function mix(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}

type BurnProfile = readonly [number, number, number, number, number]

function profileValue(progress: number, values: BurnProfile): number {
  const [phaseOneEnd, phaseTwoEnd, phaseThreeEnd, phaseFourEnd] =
    CANDLELIGHT_CONFIG.phaseEnds

  const segments = [
    [0, phaseOneEnd],
    [phaseOneEnd, phaseTwoEnd],
    [phaseTwoEnd, phaseThreeEnd],
    [phaseThreeEnd, phaseFourEnd],
  ] as const

  const segmentIndex =
    progress <= phaseOneEnd
      ? 0
      : progress <= phaseTwoEnd
        ? 1
        : progress <= phaseThreeEnd
          ? 2
          : 3
  const [start, end] = segments[segmentIndex]
  const amount = smootherStep(start, end, progress)

  return mix(
    values[segmentIndex]!,
    values[segmentIndex + 1]!,
    amount,
  )
}

export function candleBurnStateAt(elapsedMs: number): CandleBurnState {
  const progress = clamp01(elapsedMs / CANDLELIGHT_CONFIG.burnDurationMs)
  const profile: CandlelightBurnProfile =
    CANDLELIGHT_CONFIG.burnProfile
  const value = (key: keyof CandlelightBurnProfile) =>
    profileValue(progress, profile[key])
  const extinction =
    1 -
    smootherStep(CANDLELIGHT_CONFIG.extinctionStartsAt, 1, progress)

  return {
    progress,
    sourceCenterWiggleAmplitude: value(
      "sourceCenterWiggleAmplitude",
    ),
    sourceCenterWiggleTimeScale: value("sourceCenterWiggleTimeScale"),
    sourceRadiusBaseline: value("sourceRadiusBaseline"),
    sourceRadiusWiggleAmplitude: value(
      "sourceRadiusWiggleAmplitude",
    ),
    sourceRadiusWiggleTimeScale: value("sourceRadiusWiggleTimeScale"),
    sourceBrightnessBaseline:
      value("sourceBrightnessBaseline") * extinction,
    sourceBrightnessWiggleAmplitude: value(
      "sourceBrightnessWiggleAmplitude",
    ),
    sourceBrightnessWiggleTimeScale: value(
      "sourceBrightnessWiggleTimeScale",
    ),
    sourceFastFlickerAmplitude: value(
      "sourceFastFlickerAmplitude",
    ),
    sourceFastFlickerTimeScale: value("sourceFastFlickerTimeScale"),
    radiusBrightnessNoiseCorrelation: value(
      "radiusBrightnessNoiseCorrelation",
    ),
    warmth: value("warmth"),
    sourceColorWiggleAmplitude: value(
      "sourceColorWiggleAmplitude",
    ),
    sourceColorWiggleTimeScale: value(
      "sourceColorWiggleTimeScale",
    ),
    smokeAmount: value("smokeAmount"),
    smokeSputter: value("smokeSputter"),
    extinction,
  }
}

export function gaussianIlluminationAtDistance(
  distance: number,
  sigma: number,
  brightness: number,
): number {
  if (sigma <= 0) return 0
  return clamp01(
    brightness * Math.exp(-0.5 * (distance / sigma) ** 2),
  )
}
