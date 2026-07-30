import type { FlashlightDistribution } from "../FlashlightDistribution"

export const MATERIAL_CONE_DISTRIBUTION: FlashlightDistribution = {
  id: "material-cone",
  label: "Material cone",
  uniforms: {
    uSourceWidth: 0.012,
    uNearEndWidth: 0.052,
    uFarEndWidth: 0.085,
    uConePenumbra: 0.035,
    uPoolPenumbra: 0.36,
    uSpillStrength: 0.05,
    uRevealThresholdLow: 0.34,
    uRevealThresholdHigh: 0.76,
    uTremor: 0.003,
    uLensVariation: 0.055,
  },
  fragmentSource: `
uniform float uSourceWidth;
uniform float uNearEndWidth;
uniform float uFarEndWidth;
uniform float uConePenumbra;
uniform float uPoolPenumbra;
uniform float uSpillStrength;
uniform float uRevealThresholdLow;
uniform float uRevealThresholdHigh;
uniform float uTremor;
uniform float uLensVariation;

float distributionHash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float distributionNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);

  float a = distributionHash(cell);
  float b = distributionHash(cell + vec2(1.0, 0.0));
  float c = distributionHash(cell + vec2(0.0, 1.0));
  float d = distributionHash(cell + vec2(1.0, 1.0));

  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

vec2 materialConeComponents(
  vec2 uv,
  vec2 source,
  vec2 target,
  float time
) {
  vec2 metric = vec2(uViewportAspect, 1.0);
  vec2 tremor = vec2(
    sin(time * 1.37) + 0.45 * sin(time * 2.71),
    cos(time * 1.13) + 0.35 * sin(time * 2.19)
  ) * uTremor;
  vec2 aimedTarget = target + tremor;
  vec2 axis = (aimedTarget - source) * metric;
  float axisLength = max(length(axis), 0.001);
  vec2 direction = axis / axisLength;
  vec2 perpendicular = vec2(-direction.y, direction.x);
  vec2 relative = (uv - source) * metric;
  float along = dot(relative, direction);
  float progress = along / axisLength;
  float lateral = abs(dot(relative, perpendicular));
  float distanceFactor = smoothstep(0.34, 1.02, axisLength);
  float endWidth = mix(uNearEndWidth, uFarEndWidth, distanceFactor);
  float coneWidth = mix(
    uSourceWidth,
    endWidth,
    smoothstep(0.0, 1.0, clamp(progress, 0.0, 1.0))
  );
  float edgeWarp =
    (distributionNoise(uv * 19.0 + vec2(time * 0.025, 0.0)) - 0.5) *
    uConePenumbra *
    0.38;
  float coneAcross = 1.0 - smoothstep(
    coneWidth + edgeWarp,
    coneWidth + uConePenumbra + edgeWarp,
    lateral
  );
  float coneAlong =
    smoothstep(0.025, 0.16, progress) *
    (1.0 - smoothstep(0.96, 1.2, progress));
  float coneShape = coneAcross * coneAlong;

  vec2 fromTarget = (uv - aimedTarget) * metric;
  float poolAlong = dot(fromTarget, direction);
  float poolAcross = dot(fromTarget, perpendicular);
  float elongation = mix(1.05, 1.65, distanceFactor);
  float poolDistance = length(vec2(
    poolAcross / endWidth,
    poolAlong / (endWidth * elongation)
  ));
  float pool = 1.0 - smoothstep(
    1.0 - uPoolPenumbra,
    1.0 + uPoolPenumbra,
    poolDistance
  );
  float hotCore = 1.0 - smoothstep(0.0, 0.72, poolDistance);
  float lens =
    1.0 +
    (distributionNoise(fromTarget * 21.0 + vec2(7.3, 11.9)) - 0.5) *
    uLensVariation;
  float breathing = 1.0 + sin(time * 1.07) * 0.018;
  float poolLight = clamp(
    pool * (0.82 + hotCore * 0.18) * lens * breathing,
    0.0,
    1.0
  );
  float coreReveal = smoothstep(
    uRevealThresholdLow,
    uRevealThresholdHigh,
    poolLight
  );
  float spillReveal = coneShape * uSpillStrength;

  return vec2(
    clamp(coreReveal, 0.0, 1.0),
    clamp(spillReveal, 0.0, 1.0)
  );
}

float flashlightDistribution(
  vec2 uv,
  vec2 source,
  vec2 target,
  float time
) {
  return materialConeComponents(uv, source, target, time).x;
}

float flashlightVisualCone(
  vec2 uv,
  vec2 source,
  vec2 target,
  float time
) {
  return materialConeComponents(uv, source, target, time).y;
}
`,
}
