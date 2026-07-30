import type { FlashlightDistribution } from "../FlashlightDistribution"
import { CLASSIC_CIRCLE_DISTRIBUTION } from "./classicCircle"
import { MATERIAL_CONE_DISTRIBUTION } from "./materialCone"

export const FLASHLIGHT_DISTRIBUTIONS = {
  "material-cone": MATERIAL_CONE_DISTRIBUTION,
  "classic-circle": CLASSIC_CIRCLE_DISTRIBUTION,
} as const satisfies Record<string, FlashlightDistribution>

export type FlashlightDistributionId = keyof typeof FLASHLIGHT_DISTRIBUTIONS

export function flashlightDistribution(
  id: FlashlightDistributionId,
): FlashlightDistribution {
  return FLASHLIGHT_DISTRIBUTIONS[id]
}
