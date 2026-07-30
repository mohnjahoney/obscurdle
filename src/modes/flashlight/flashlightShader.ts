import type { FlashlightDistribution } from "./FlashlightDistribution"

export function buildFlashlightFragmentShader(
  distribution: FlashlightDistribution,
): string {
  return `
#version 100
#pragma phaserTemplate(shaderName)

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uSource;
uniform vec2 uTarget;
uniform float uTime;
uniform float uViewportAspect;
uniform vec2 uKeyboardLightSource;
uniform vec2 uKeyboardLightTarget;
uniform float uKeyboardLightSourceWidth;
uniform float uKeyboardLightTargetWidth;
uniform float uKeyboardLightPenumbra;
uniform float uKeyboardLightIntensity;

varying vec2 outTexCoord;

${distribution.fragmentSource}

float keyboardFlashlightDistribution(vec2 uv) {
  vec2 metric = vec2(uViewportAspect, 1.0);
  vec2 axis = (uKeyboardLightTarget - uKeyboardLightSource) * metric;
  float axisLength = max(length(axis), 0.001);
  vec2 direction = axis / axisLength;
  vec2 perpendicular = vec2(-direction.y, direction.x);
  vec2 relative = (uv - uKeyboardLightSource) * metric;
  float along = dot(relative, direction);
  float progress = along / axisLength;
  float lateral = abs(dot(relative, perpendicular));
  float width = mix(
    uKeyboardLightSourceWidth,
    uKeyboardLightTargetWidth,
    smoothstep(0.0, 1.0, clamp(progress, 0.0, 1.0))
  );
  float across = 1.0 - smoothstep(
    width,
    width + uKeyboardLightPenumbra,
    lateral
  );
  float lengthMask =
    smoothstep(-0.04, 0.04, progress) *
    (1.0 - smoothstep(0.96, 1.04, progress));

  return across * lengthMask * uKeyboardLightIntensity;
}

void main() {
  // Phaser input and layout coordinates start at the top-left, while the
  // shader texture coordinate starts at the bottom-left.
  vec2 uv = vec2(outTexCoord.x, 1.0 - outTexCoord.y);
  float beam = flashlightDistribution(uv, uSource, uTarget, uTime);
  float keyboardBeam = keyboardFlashlightDistribution(uv);
  float illumination = max(beam, keyboardBeam);
  float maskAlpha = clamp(illumination, 0.0, 1.0);

  gl_FragColor = vec4(vec3(maskAlpha), maskAlpha);
}
`
}

export function buildFlashlightConeFragmentShader(
  distribution: FlashlightDistribution,
): string {
  return `
#version 100
#pragma phaserTemplate(shaderName)

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uSource;
uniform vec2 uTarget;
uniform float uTime;
uniform float uViewportAspect;
uniform vec3 uVisualConeColor;

varying vec2 outTexCoord;

${distribution.fragmentSource}

void main() {
  vec2 uv = vec2(outTexCoord.x, 1.0 - outTexCoord.y);
  float coneAlpha = clamp(
    flashlightVisualCone(uv, uSource, uTarget, uTime),
    0.0,
    1.0
  );

  // Phaser's normal WebGL blend path expects premultiplied alpha.
  gl_FragColor = vec4(uVisualConeColor * coneAlpha, coneAlpha);
}
`
}
