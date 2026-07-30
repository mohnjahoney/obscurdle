export function radialHeatAtDistance(
  distance: number,
  radius: number,
): number {
  if (radius <= 0) return 0
  const normalizedDistance = distance / radius
  return Math.exp(-0.5 * normalizedDistance * normalizedDistance)
}

export function accumulatedHeat(
  currentHeat: number,
  distance: number,
  deltaSeconds: number,
  options: {
    radius: number
    intensity: number
    gainPerSecond: number
    maximumHeat: number
  },
): number {
  const addedHeat =
    radialHeatAtDistance(distance, options.radius) *
    options.intensity *
    options.gainPerSecond *
    Math.max(deltaSeconds, 0)
  return Math.min(currentHeat + addedHeat, options.maximumHeat)
}
