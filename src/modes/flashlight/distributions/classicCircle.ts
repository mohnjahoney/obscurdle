import type { FlashlightDistribution } from "../FlashlightDistribution"

/**
 * Deliberately conventional reference distribution retained for comparison.
 */
export const CLASSIC_CIRCLE_DISTRIBUTION: FlashlightDistribution = {
  id: "classic-circle",
  label: "Classic circle",
  uniforms: {
    uCircleRadius: 0.13,
    uCircleSoftness: 0.075,
    uCircleRevealThresholdLow: 0.34,
    uCircleRevealThresholdHigh: 0.76,
  },
  fragmentSource: `
uniform float uCircleRadius;
uniform float uCircleSoftness;
uniform float uCircleRevealThresholdLow;
uniform float uCircleRevealThresholdHigh;

float flashlightDistribution(
  vec2 uv,
  vec2 source,
  vec2 target,
  float time
) {
  vec2 metric = vec2(uViewportAspect, 1.0);
  float distanceFromTarget = length((uv - target) * metric);
  float light = 1.0 - smoothstep(
    uCircleRadius - uCircleSoftness,
    uCircleRadius + uCircleSoftness,
    distanceFromTarget
  );
  return smoothstep(
    uCircleRevealThresholdLow,
    uCircleRevealThresholdHigh,
    light
  );
}

float flashlightVisualCone(
  vec2 uv,
  vec2 source,
  vec2 target,
  float time
) {
  return 0.0;
}
`,
}
