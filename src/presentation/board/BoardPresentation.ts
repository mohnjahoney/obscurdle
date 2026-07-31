export const BOARD_PRESENTATION_IDS = ["standard", "borderless"] as const

export type BoardPresentationId = (typeof BOARD_PRESENTATION_IDS)[number]

interface BoardPresentation {
  showTileOutline: boolean
  showUnevaluatedFace: boolean
}

const BOARD_PRESENTATIONS: Record<BoardPresentationId, BoardPresentation> = {
  standard: {
    showTileOutline: true,
    showUnevaluatedFace: true,
  },
  borderless: {
    showTileOutline: false,
    showUnevaluatedFace: false,
  },
}

export function boardPresentation(
  id: BoardPresentationId,
): BoardPresentation {
  return BOARD_PRESENTATIONS[id]
}
