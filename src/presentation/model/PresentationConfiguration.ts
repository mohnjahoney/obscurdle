import type { BoardPresentationId } from "../board/BoardPresentation"
import type { KeyboardPresentationId } from "../keyboard/KeyboardPresentation"

export interface PresentationConfiguration {
  board: BoardPresentationId
  keyboard: KeyboardPresentationId
}
