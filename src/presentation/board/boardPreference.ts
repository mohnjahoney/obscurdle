import {
  BOARD_PRESENTATION_IDS,
  type BoardPresentationId,
} from "./BoardPresentation"

const STORAGE_KEY = "obscurdleBoardPresentation"

function isBoardPresentationId(
  value: unknown,
): value is BoardPresentationId {
  return (
    typeof value === "string" &&
    BOARD_PRESENTATION_IDS.some((id) => id === value)
  )
}

export function loadBoardPresentation(): BoardPresentationId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isBoardPresentationId(stored) ? stored : "tiles"
  } catch {
    return "tiles"
  }
}

export function saveBoardPresentation(
  presentationId: BoardPresentationId,
): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, presentationId)
  } catch {
    // The live selection still works when storage is unavailable.
  }
}
