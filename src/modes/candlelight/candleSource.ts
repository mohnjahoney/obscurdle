import type { CandleBurnState } from "./candleBurn"
import { CANDLELIGHT_CONFIG } from "./candlelightConfig"
import {
  CANDLE_NOISE_CHANNEL,
  crossfadedProfileNoise,
  smoothValueNoiseProvider,
  type CandleNoiseProvider,
} from "./candleNoise"

export interface CandleSourceSample {
  center: readonly [number, number]
  sigma: number
  brightness: number
  warmth: number
  smokeTemporalAmount: number
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

export function sampleCandleSource(
  elapsedSeconds: number,
  state: CandleBurnState,
  seed: number,
  provider: CandleNoiseProvider = smoothValueNoiseProvider,
): CandleSourceSample {
  const profile = CANDLELIGHT_CONFIG.burnProfile
  const noise = (
    timeScales: readonly [number, number, number, number, number],
    channel: number,
  ) =>
    crossfadedProfileNoise(
      elapsedSeconds,
      state.progress,
      timeScales,
      channel,
      seed,
      provider,
    )

  const centerXNoise = noise(
    profile.sourceCenterWiggleTimeScale,
    CANDLE_NOISE_CHANNEL.centerX,
  )
  const centerYNoise = noise(
    profile.sourceCenterWiggleTimeScale,
    CANDLE_NOISE_CHANNEL.centerY,
  )
  const sharedTimeScales = profile.sourceRadiusWiggleTimeScale.map(
    (radiusScale, index) =>
      Math.sqrt(
        radiusScale *
          profile.sourceBrightnessWiggleTimeScale[index]!,
      ),
  ) as unknown as readonly [number, number, number, number, number]
  const sharedNoise = noise(
    sharedTimeScales,
    CANDLE_NOISE_CHANNEL.sharedSource,
  )
  const radiusNoise =
    noise(
      profile.sourceRadiusWiggleTimeScale,
      CANDLE_NOISE_CHANNEL.radius,
    ) *
      (1 - state.radiusBrightnessNoiseCorrelation) +
    sharedNoise * state.radiusBrightnessNoiseCorrelation
  const brightnessNoise =
    noise(
      profile.sourceBrightnessWiggleTimeScale,
      CANDLE_NOISE_CHANNEL.brightness,
    ) *
      (1 - state.radiusBrightnessNoiseCorrelation) +
    sharedNoise * state.radiusBrightnessNoiseCorrelation
  const fastFlicker = noise(
    profile.sourceFastFlickerTimeScale,
    CANDLE_NOISE_CHANNEL.fastFlicker,
  )
  const colorNoise = noise(
    profile.sourceColorWiggleTimeScale,
    CANDLE_NOISE_CHANNEL.color,
  )
  const smokeNoise = noise(
    [0.5, 0.65, 0.8, 0.5, 0.24],
    CANDLE_NOISE_CHANNEL.smoke,
  )

  return {
    center: [
      CANDLELIGHT_CONFIG.sourceCenterBaseline[0] +
        centerXNoise * state.sourceCenterWiggleAmplitude,
      CANDLELIGHT_CONFIG.sourceCenterBaseline[1] +
        centerYNoise * state.sourceCenterWiggleAmplitude,
    ],
    sigma:
      state.sourceRadiusBaseline *
      Math.exp(state.sourceRadiusWiggleAmplitude * radiusNoise),
    brightness: clamp01(
      state.sourceBrightnessBaseline *
        (1 +
          state.sourceBrightnessWiggleAmplitude * brightnessNoise +
          state.sourceFastFlickerAmplitude * fastFlicker),
    ),
    warmth: clamp01(
      state.warmth +
        state.sourceColorWiggleAmplitude * colorNoise,
    ),
    smokeTemporalAmount: 0.5 + smokeNoise * 0.5,
  }
}
