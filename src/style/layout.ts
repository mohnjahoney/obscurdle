export const GAME_LAYOUT = {
  width: 430,
  height: 760,
  page: {
    inset: 20,
  },
  masthead: {
    top: 17,
    titleY: 44,
    deckY: 77,
    topRuleY: 16,
    bottomRuleY: 98,
  },
  board: {
    top: 116,
    tileSize: 50,
    gap: 7,
    columns: 5,
    rows: 6,
  },
  status: {
    y: 480,
  },
  keyboard: {
    top: 510,
    keyWidth: 36,
    keyHeight: 50,
    wideKeyWidth: 52,
    gap: 4,
    rowGap: 7,
  },
  footer: {
    y: 744,
  },
  menu: {
    kickerY: 142,
    titleY: 222,
    deckY: 282,
    descriptionY: 330,
    modeButtonStartY: 390,
    modeButtonGap: 41,
    noteY: 724,
  },
  dialog: {
    width: 338,
    height: 240,
    y: 370,
    titleOffsetY: -67,
    bodyOffsetY: -19,
    primaryButtonOffsetY: 47,
    secondaryButtonOffsetY: 91,
  },
  navigation: {
    indexX: 382,
    indexY: 76,
    indexHitWidth: 76,
    indexHitHeight: 44,
    panelX: 215,
    panelY: 380,
    panelWidth: 382,
    panelHeight: 650,
    contentWidth: 322,
    kickerY: 91,
    titleY: 137,
    subtitleY: 181,
    linkStartY: 250,
    linkGap: 62,
    linkHeight: 52,
    bodyY: 226,
    bodyWidth: 310,
    confirmBodyY: 226,
  },
  button: {
    width: 218,
    height: 48,
  },
} as const

export function boardWidth(): number {
  return (
    GAME_LAYOUT.board.columns * GAME_LAYOUT.board.tileSize +
    (GAME_LAYOUT.board.columns - 1) * GAME_LAYOUT.board.gap
  )
}
