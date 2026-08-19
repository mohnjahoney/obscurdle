import {
  KEYBOARD_PRESENTATION_IDS,
  type KeyboardPresentationId,
} from "./KeyboardPresentation"

const STORAGE_KEY = "obscurdleKeyboardPresentation"

function isKeyboardPresentationId(
  value: unknown,
): value is KeyboardPresentationId {
  return (
    typeof value === "string" &&
    KEYBOARD_PRESENTATION_IDS.some((id) => id === value)
  )
}

export function loadKeyboardPresentation(): KeyboardPresentationId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isKeyboardPresentationId(stored) ? stored : "digital"
  } catch {
    return "digital"
  }
}

export function saveKeyboardPresentation(
  presentationId: KeyboardPresentationId,
): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, presentationId)
  } catch {
    // The live selection still works when storage is unavailable.
  }
}

