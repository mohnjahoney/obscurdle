export const BOARD_PRESENTATION_IDS = ["tiles", "bare"] as const

export type BoardPresentationId =
  (typeof BOARD_PRESENTATION_IDS)[number]
