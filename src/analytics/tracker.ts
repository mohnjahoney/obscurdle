const TRACKER_ENDPOINT = "https://public-data-receiver-test.mohnjahoney.chatgpt.site/api/test"

export interface ObscurdleSessionMetadata {
  name: string
}

type AnalyticsDetails = Record<string, unknown>

let sessionMetadata: ObscurdleSessionMetadata = { name: "" }
const sessionId = createAnalyticsId()
let sessionStarted = false
let puzzleNumber = 0

export function setSessionName(name: string): void {
  sessionMetadata = { name: name.trim().slice(0, 32) }
}

export function getSessionMetadata(): ObscurdleSessionMetadata {
  return { ...sessionMetadata }
}

export function trackSessionStarted(): void {
  if (sessionStarted) return
  sessionStarted = true
  trackObscurdleEvent("obscurdle:session_started", { platform: "web" })
}

export function startPuzzleAnalytics(): { puzzleId: string; puzzleNumber: number } {
  puzzleNumber += 1
  return { puzzleId: createAnalyticsId(), puzzleNumber }
}

export function trackObscurdleEvent(message: string, details: AnalyticsDetails = {}): void {
  void fetch(TRACKER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: message,
      message,
      eventId: createAnalyticsId(),
      sessionId,
      occurredAt: new Date().toISOString(),
      session: getSessionMetadata(),
      ...details,
    }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt or alter gameplay.
  })
}

function createAnalyticsId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
