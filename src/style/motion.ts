export const GAME_MOTION = {
  tile: {
    typeDuration: 85,
    revealStagger: 75,
    inkBloom: {
      duration: 10000,
      originJitter: 0.2,
      seedRange: 100,
      edgeNoise: 0.3,
      edgeFeather: 0.1,
      pigmentVariation: 0,
      settleStartProgress: 0.92,
    },
    invalidEraseStepMs: 90,
  },
  key: {
    pressDuration: 70,
  },
  scene: {
    fadeDuration: 180,
  },
  dialog: {
    delayAfterReveal: 220,
    enterDuration: 220,
    startScale: 0.96,
  },
  navigation: {
    enterDuration: 180,
  },
  message: {
    duration: 1_650,
  },
} as const
