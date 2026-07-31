import { MODE_IDS, type ModeId } from "../modes/ObscuringMode"

const HISTORY_KEY = "obscurdleScreen"
const MODE_ID_SET = new Set<string>(MODE_IDS)

function isModeId(value: string): value is ModeId {
  return MODE_ID_SET.has(value)
}

interface MenuHistoryState {
  [HISTORY_KEY]: "menu"
}

interface PlayHistoryState {
  [HISTORY_KEY]: "play"
  modeId: ModeId
}

type ObscurdleHistoryState = MenuHistoryState | PlayHistoryState

function currentState(): Partial<ObscurdleHistoryState> | null {
  const state: unknown = window.history.state
  return typeof state === "object" && state !== null
    ? (state as Partial<ObscurdleHistoryState>)
    : null
}

function urlWithoutMode(): string {
  const url = new URL(window.location.href)
  url.searchParams.delete("mode")
  return `${url.pathname}${url.search}${url.hash}`
}

function urlForMode(modeId: ModeId): string {
  const url = new URL(window.location.href)
  url.searchParams.set("mode", modeId)
  return `${url.pathname}${url.search}${url.hash}`
}

export function markMenuHistory(): void {
  const state: MenuHistoryState = { [HISTORY_KEY]: "menu" }
  window.history.replaceState(state, "", urlWithoutMode())
}

export function markPlayHistory(modeId: ModeId): void {
  const state: PlayHistoryState = { [HISTORY_KEY]: "play", modeId }
  const current = currentState()

  if (current?.[HISTORY_KEY] === "play") {
    window.history.replaceState(state, "", urlForMode(modeId))
  } else {
    window.history.pushState(state, "", urlForMode(modeId))
  }
}

export function menuStateFromHistory(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    (state as Partial<MenuHistoryState>)[HISTORY_KEY] === "menu"
  )
}

export function playModeFromHistory(state: unknown): ModeId | undefined {
  if (typeof state !== "object" || state === null) return undefined

  const candidate = state as Partial<PlayHistoryState>
  if (
    candidate[HISTORY_KEY] !== "play" ||
    typeof candidate.modeId !== "string"
  ) {
    return undefined
  }

  return isModeId(candidate.modeId) ? candidate.modeId : undefined
}
