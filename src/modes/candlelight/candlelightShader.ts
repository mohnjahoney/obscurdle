const CANDLE_FIELD_SOURCE = `
uniform vec2 uSourceCenter;
uniform float uSourceRadius;
uniform float uSourceBrightness;
uniform float uViewportAspect;

float candleIllumination(vec2 uv) {
  float distanceFromSource = length(
    (uv - uSourceCenter) * vec2(uViewportAspect, 1.0)
  );
  float normalizedDistance =
    distanceFromSource / max(uSourceRadius, 0.001);

  // The one and only spatial illumination function.
  return uSourceBrightness * exp(
    -0.5 * normalizedDistance * normalizedDistance
  );
}
`

function shaderHeader(): string {
  return `
#version 100
#pragma phaserTemplate(shaderName)

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 outTexCoord;

${CANDLE_FIELD_SOURCE}
`
}

export function buildCandleMaskFragmentShader(): string {
  return `${shaderHeader()}
void main() {
  vec2 uv = vec2(outTexCoord.x, 1.0 - outTexCoord.y);
  float illumination = candleIllumination(uv);
  gl_FragColor = vec4(vec3(illumination), illumination);
}
`
}

export function buildCandleGlowFragmentShader(): string {
  return `${shaderHeader()}
uniform vec3 uGlowCoolColor;
uniform vec3 uGlowWarmColor;
uniform float uResolvedWarmth;
uniform float uGlowAlpha;

void main() {
  vec2 uv = vec2(outTexCoord.x, 1.0 - outTexCoord.y);
  float glowAlpha = candleIllumination(uv) * uGlowAlpha;
  vec3 glowColor = mix(
    uGlowCoolColor,
    uGlowWarmColor,
    uResolvedWarmth
  );
  gl_FragColor = vec4(glowColor * glowAlpha, glowAlpha);
}
`
}

export function buildCandleSmokeFragmentShader(): string {
  return `${shaderHeader()}
uniform float uTime;
uniform float uNoiseSeed;
uniform float uSmokeAmount;
uniform float uSmokeSputter;
uniform float uSmokeTemporalAmount;
uniform vec3 uSmokeColor;
uniform float uSmokeMaximumAlpha;
uniform float uSmokePlumeHeight;
uniform float uSmokeBaseWidth;
uniform float uSmokeTopWidth;
uniform float uSmokeDrift;
uniform float uSmokeTurbulence;
uniform float uSmokeRiseSpeed;

float candleSpatialHash(vec2 point) {
  return fract(
    sin(dot(point, vec2(127.1, 311.7)) + uNoiseSeed) *
    43758.5453123
  );
}

float candleSpatialNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  float a = candleSpatialHash(cell);
  float b = candleSpatialHash(cell + vec2(1.0, 0.0));
  float c = candleSpatialHash(cell + vec2(0.0, 1.0));
  float d = candleSpatialHash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

void main() {
  vec2 uv = vec2(outTexCoord.x, 1.0 - outTexCoord.y);
  float heightAboveFlame = uSourceCenter.y - uv.y;
  float progress = clamp(
    heightAboveFlame / uSmokePlumeHeight,
    0.0,
    1.0
  );
  float verticalMask =
    smoothstep(0.015, 0.075, heightAboveFlame) *
    (1.0 - smoothstep(0.78, 1.0, progress));
  float risingTime = uTime * uSmokeRiseSpeed;
  float broadDrift =
    sin(progress * 8.5 - risingTime * 2.7) *
    uSmokeDrift *
    (0.25 + progress * 0.75);
  float fineDrift =
    sin(progress * 24.0 + risingTime * 5.2) *
    uSmokeTurbulence *
    (0.2 + progress);
  float noisyDrift =
    (candleSpatialNoise(vec2(
      progress * 5.0 - risingTime,
      risingTime * 0.7
    )) - 0.5) *
    uSmokeTurbulence *
    1.7;
  float centerX =
    uSourceCenter.x + broadDrift + fineDrift + noisyDrift;
  float width = mix(uSmokeBaseWidth, uSmokeTopWidth, progress);
  float lateral =
    abs((uv.x - centerX) * uViewportAspect) /
    max(width, 0.001);
  float primaryWisp = exp(-lateral * lateral * 2.2);
  float flowingNoise = candleSpatialNoise(vec2(
    progress * 11.0 - risingTime * 6.0,
    progress * 3.7 + risingTime
  ));
  float continuousSmoke = mix(0.46, 1.0, flowingNoise);
  float brokenSmoke = smoothstep(0.38, 0.82, flowingNoise);
  float breakup = mix(
    continuousSmoke,
    brokenSmoke,
    uSmokeSputter
  );
  float temporalAmount = mix(
    1.0,
    0.18 + uSmokeTemporalAmount * 1.08,
    uSmokeSputter
  );
  float density =
    primaryWisp * verticalMask * breakup * temporalAmount;
  float smokeAlpha = clamp(
    density * uSmokeAmount * uSmokeMaximumAlpha,
    0.0,
    uSmokeMaximumAlpha
  );

  gl_FragColor = vec4(uSmokeColor * smokeAlpha, smokeAlpha);
}
`
}
