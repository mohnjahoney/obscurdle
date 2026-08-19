import type { FlashlightDistributionId } from "./distributions/registry"

export const FLASHLIGHT_CONFIG = {
  distribution: "material-cone" as FlashlightDistributionId,
  darkness: 0.99,
  darkDesaturation: 0.9,
  darkBlurPixels: 2,
  darkBlurQuality: 0,
  darkBlurSteps: 1,
  darkBlurStrength: 0.75,
  keyboardLight: {
    sourceX: -0.18,
    targetX: 1.18,
    angleDegrees: 15,
    sourceWidth: 0.035,
    targetWidth: 0.11,
    penumbra: 0.06,
    intensity: 0.72,
  },
  sourceX: 0.7,
  sourceY: 1.5,
  sourceHorizontalFollow: 0.2,
  visualConeColor: [0.86, 0.84, 0.76] as const,
  initialTarget: [0.5, 0.34] as const,
  aimSmoothingMs: 85,
  touchOffsetY: 72,
  debugConeInformationControl: {
    enabled: false,
    minimum: 0,
    maximum: 0.15,
    step: 0.001,
  },
} as const
