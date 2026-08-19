export const GAME_STYLE = {
  color: {
    paper: 0xf3eedf,
    paperLight: 0xf8f4e8,
    ink: 0x211f1a,
    mutedInk: 0x6d685d,
    faintInk: 0xa49c8d,
    rule: 0xa69d8b,
    lightRule: 0xd1c9b9,
    emptyTile: 0xf7f2e5,
    filledTile: 0xeee7d7,
    absent: 0x5d5a52,
    present: 0xb28b42,
    correct: 0x58755a,
    key: 0xe3dccd,
    keyPressed: 0xd4cab6,
    overlay: 0x211f1a,
  },
  textColor: {
    paper: "#f3eedf",
    paperLight: "#f8f4e8",
    ink: "#211f1a",
    mutedInk: "#6d685d",
    faintInk: "#a49c8d",
    editorialAbsent: "#9a554b",
    editorialPresent: "#98762f",
    editorialCorrect: "#56805b",
  },
  type: {
    displayFamily: "Georgia, 'Times New Roman', serif",
    bodyFamily: "Georgia, 'Times New Roman', serif",
    bareLetterFamily:
      "'American Typewriter', 'Courier Prime', 'Courier New', monospace",
    titleSize: 38,
    deckSize: 14,
    sectionSize: 13,
    tileSize: 29,
    bareLetterSize: 35,
    keySize: 17,
    wideKeySize: 10,
    messageSize: 15,
    dialogTitleSize: 31,
    dialogBodySize: 17,
    buttonSize: 15,
    footerSize: 11,
  },
  rule: {
    thin: 1,
    medium: 2,
    masthead: 3,
  },
  alpha: {
    rule: 0.75,
    softRule: 0.42,
    overlay: 0.36,
    navigationOverlay: 0.54,
  },
  tile: {
    borderWidth: 1.5,
    activeBorderWidth: 2.5,
    popScale: 1.08,
    pigmentOpacity: 1,
  },
  writtenWord: {
    left: 158,
    tracking: 2,
    trackingVariationPerRow: 0.8,
    startVariationPerRow: 4,
    baselineVariationPerRow: 0.8,
    baselineVariationPerLetter: 0.25,
    fallbackGlyphWidthFactor: 0.68,
  },
  editorial: {
    strike: {
      color: 0xc34f45,
      alpha: 0.96,
      lineWidth: 3.35,
      overshoot: 3.5,
      wobble: 1.2,
    },
    highlight: {
      color: 0xffe45a,
      alpha: 0.3,
      height: 20,
      overshoot: 4,
      edgeVariation: 2.2,
      startDwellAlpha: 0.055,
      startDwellWidth: 5,
      endFeatherLength: 8,
      streakAlpha: 0.055,
      streakWidth: 1.4,
    },
  },
  key: {
    borderWidth: 1,
    pressedScale: 0.96,
  },
  dialog: {
    borderWidth: 2,
  },
  depth: {
    dialog: 200,
    navigation: 10_000,
  },
} as const

export type EvaluationVisualState =
  | "empty"
  | "filled"
  | "absent"
  | "present"
  | "correct"

export function tileFill(state: EvaluationVisualState): number {
  return GAME_STYLE.color[state === "empty" ? "emptyTile" : state === "filled" ? "filledTile" : state]
}

export function tileInk(state: EvaluationVisualState): string {
  return state === "absent" || state === "present" || state === "correct"
    ? GAME_STYLE.textColor.paperLight
    : GAME_STYLE.textColor.ink
}
