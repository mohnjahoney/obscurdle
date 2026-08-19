import { CandlelightMode } from "./candlelight/CandlelightMode"
import { FadingInkMode } from "./FadingInkMode"
import { FlashlightMode } from "./flashlight/FlashlightMode"
import { MagnifyingGlassMode } from "./magnifyingGlass/MagnifyingGlassMode"
import { MisprintMode } from "./misprint/MisprintMode"
import type { ModeDefinition, ModeId } from "./ObscuringMode"
import { PlainMode } from "./PlainMode"
import { SneakingTilesMode } from "./sneakingTiles/SneakingTilesMode"

export const MENU_MODE_IDS = [
  "misprint",
  "fading-ink",
  "sneaking-tiles",
  "magnifying-glass",
  "flashlight",
  "candlelight",
  "plain",
] as const satisfies readonly ModeId[]

export const MODE_DEFINITIONS: Record<ModeId, ModeDefinition> = {
  misprint: {
    id: "misprint",
    menuLabel: "MISPRINT",
    mastheadLabel: "MISPRINT",
    create: () => new MisprintMode(),
  },
  plain: {
    id: "plain",
    menuLabel: "PLAIN EDITION",
    mastheadLabel: "PLAIN",
    create: () => new PlainMode(),
  },
  "fading-ink": {
    id: "fading-ink",
    menuLabel: "FADING INK",
    mastheadLabel: "FADING INK",
    create: () => new FadingInkMode(),
  },
  "sneaking-tiles": {
    id: "sneaking-tiles",
    menuLabel: "SNEAKING TILES",
    mastheadLabel: "SNEAKING TILES",
    create: () => new SneakingTilesMode(),
  },
  "magnifying-glass": {
    id: "magnifying-glass",
    menuLabel: "MAGNIFYING GLASS",
    mastheadLabel: "MAGNIFYING GLASS",
    create: () => new MagnifyingGlassMode(),
  },
  flashlight: {
    id: "flashlight",
    menuLabel: "FLASHLIGHT",
    mastheadLabel: "FLASHLIGHT",
    create: () => new FlashlightMode(),
  },
  candlelight: {
    id: "candlelight",
    menuLabel: "CANDLELIGHT",
    mastheadLabel: "CANDLELIGHT",
    create: () => new CandlelightMode(),
  },
}

export function modeDefinition(id: ModeId): ModeDefinition {
  return MODE_DEFINITIONS[id]
}
