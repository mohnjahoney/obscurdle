import { CANDLELIGHT_CONFIG } from "./candlelightConfig"

/**
 * A provider supplies only normalized, continuous temporal randomness. It
 * deliberately knows nothing about candle phases or physical parameters.
 */
export interface CandleNoiseProvider {
  readonly id: string
  sample(seed: number, channel: number, noiseTime: number): number
}

function smootherStep01(value: number): number {
  return value * value * value * (value * (value * 6 - 15) + 10)
}

function hash(seed: number, channel: number, controlPoint: number): number {
  const coordinate =
    controlPoint * 127.1 + channel * 311.7 + seed * 74.7
  const fractional =
    Math.sin(coordinate) * 43_758.545_312_3 -
    Math.floor(Math.sin(coordinate) * 43_758.545_312_3)
  return fractional * 2 - 1
}

export const smoothValueNoiseProvider: CandleNoiseProvider = {
  id: "smooth-value-noise-v1",
  sample(seed, channel, noiseTime) {
    const controlPoint = Math.floor(noiseTime)
    const local = noiseTime - controlPoint
    const amount = smootherStep01(local)
    const start = hash(seed, channel, controlPoint)
    const end = hash(seed, channel, controlPoint + 1)
    return start + (end - start) * amount
  },
}

export const CANDLE_NOISE_CHANNEL = {
  centerX: 10,
  centerY: 20,
  radius: 30,
  brightness: 40,
  sharedSource: 50,
  fastFlicker: 60,
  color: 70,
  smoke: 80,
} as const

type TimeScaleProfile = readonly [
  number,
  number,
  number,
  number,
  number,
]

export function crossfadedProfileNoise(
  elapsedSeconds: number,
  progress: number,
  timeScales: TimeScaleProfile,
  baseChannel: number,
  seed: number,
  provider: CandleNoiseProvider = smoothValueNoiseProvider,
): number {
  const [phaseOneEnd, phaseTwoEnd, phaseThreeEnd] =
    CANDLELIGHT_CONFIG.phaseEnds
  const segment =
    progress <= phaseOneEnd
      ? 0
      : progress <= phaseTwoEnd
        ? 1
        : progress <= phaseThreeEnd
          ? 2
          : 3
  const starts = [0, phaseOneEnd, phaseTwoEnd, phaseThreeEnd] as const
  const ends = CANDLELIGHT_CONFIG.phaseEnds
  const rawAmount =
    (progress - starts[segment]) /
    (ends[segment]! - starts[segment])
  const amount = smootherStep01(Math.min(Math.max(rawAmount, 0), 1))
  const startNoise = provider.sample(
    seed,
    baseChannel + segment,
    elapsedSeconds / timeScales[segment]!,
  )
  const endNoise = provider.sample(
    seed,
    baseChannel + segment + 1,
    elapsedSeconds / timeScales[segment + 1]!,
  )

  return startNoise + (endNoise - startNoise) * amount
}
