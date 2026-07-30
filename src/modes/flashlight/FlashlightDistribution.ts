export type FlashlightUniformValue =
  | number
  | readonly [number, number]
  | readonly [number, number, number]

/**
 * A distribution supplies the material shape of the movable light.
 *
 * Its GLSL must define:
 * float flashlightDistribution(vec2 uv, vec2 source, vec2 target, float time)
 * float flashlightVisualCone(vec2 uv, vec2 source, vec2 target, float time)
 *
 * The first function may reveal scene detail. The second is rendered as an
 * independent translucent wash and must contain no scene imagery.
 */
export interface FlashlightDistribution {
  id: string
  label: string
  fragmentSource: string
  uniforms: Readonly<Record<string, FlashlightUniformValue>>
}
