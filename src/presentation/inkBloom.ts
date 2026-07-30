import { GAME_MOTION } from "../style/motion"

export interface InkBloomParameters {
  origin: [number, number]
  seed: number
}

type RandomSource = () => number

function unitSample(random: RandomSource): number {
  return Math.min(Math.max(random(), 0), 1)
}

export function createInkBloomParameters(
  random: RandomSource = Math.random,
): InkBloomParameters {
  const jitter = GAME_MOTION.tile.inkBloom.originJitter
  const sampleOrigin = () => 0.5 + (unitSample(random) * 2 - 1) * jitter

  return {
    origin: [sampleOrigin(), sampleOrigin()],
    seed: unitSample(random) * GAME_MOTION.tile.inkBloom.seedRange,
  }
}

/**
 * Bounded ink-bloom reveal inspired by Arlind Aliu's noisy SDF transition:
 * https://tympanus.net/codrops/2025/01/22/webgl-shader-techniques-for-dynamic-image-transitions/
 *
 * The implementation is purpose-built for Phaser tile reveals: an expanding
 * distance field is distorted by layered value noise, clipped by the shader
 * quad, and discarded as soon as the ordinary tile fill can take over.
 */
export const INK_BLOOM_FRAGMENT_SHADER = `
#version 100
#pragma phaserTemplate(shaderName)

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float uProgress;
uniform vec2 uOrigin;
uniform float uSeed;
uniform float uEdgeNoise;
uniform float uEdgeFeather;
uniform float uPigmentVariation;
uniform float uSettleStartProgress;

varying vec2 outTexCoord;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7)) + uSeed) * 43758.5453123);
}

float valueNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);

  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));

  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float fbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int octave = 0; octave < 4; octave++) {
    value += amplitude * valueNoise(point);
    point = point * 2.03 + vec2(17.1, 9.2);
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = outTexCoord;
  vec2 delta = uv - uOrigin;
  float distanceFromImpact = length(delta);

  float broadNoise = fbm(uv * 3.8 + vec2(uSeed * 0.013));
  float fineNoise = valueNoise(uv * 14.0 + vec2(uSeed * 0.071));
  float angle = atan(delta.y, delta.x);
  float capillaryFingers =
    pow(0.5 + 0.5 * sin(angle * 9.0 + broadNoise * 5.0 + uSeed), 4.0);

  float irregularity =
    (broadNoise - 0.5) * uEdgeNoise +
    (fineNoise - 0.5) * uEdgeNoise * 0.32 +
    capillaryFingers * uEdgeNoise * 0.2;

  float easedProgress = 1.0 - pow(1.0 - uProgress, 3.0);
  float radius = mix(0.018, 1.05, easedProgress);
  float inkMask = 1.0 - smoothstep(
    radius - uEdgeFeather,
    radius + uEdgeFeather,
    distanceFromImpact - irregularity
  );

  float pigment = 1.0 - uPigmentVariation * (broadNoise - 0.5);
  float alpha = clamp(inkMask, 0.0, 1.0);
  float settled = smoothstep(0.72, 1.0, easedProgress);
  alpha *= mix(clamp(pigment, 0.0, 1.0), 1.0, settled);
  float finalCoverage = smoothstep(uSettleStartProgress, 1.0, uProgress);
  alpha = mix(alpha, 1.0, finalCoverage);

  gl_FragColor = vec4(vec3(alpha), alpha);
}
`
