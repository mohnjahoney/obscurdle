import { afterEach, describe, expect, it, vi } from "vitest"
import {
  getSessionMetadata,
  setSessionName,
  TRACKER_ENDPOINT,
  trackObscurdleEvent,
} from "./tracker"

describe("analytics tracker", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("posts each event to the structured analytics endpoint", () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()))
    vi.stubGlobal("fetch", fetchMock)
    setSessionName("Ada")

    trackObscurdleEvent("obscurdle:word_submitted", {
      puzzleId: "puzzle-1",
      word: "CRATE",
      submissionNumber: 1,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>
    const [url, request] = calls[0]!
    const payload = JSON.parse(String(request.body)) as Record<string, unknown>

    expect(url).toBe(TRACKER_ENDPOINT)
    expect(request.method).toBe("POST")
    expect(payload).toMatchObject({
      event: "obscurdle:word_submitted",
      message: "obscurdle:word_submitted",
      puzzleId: "puzzle-1",
      word: "CRATE",
      submissionNumber: 1,
      session: { name: "Ada" },
    })
    expect(typeof payload.eventId).toBe("string")
    expect(typeof payload.sessionId).toBe("string")
    expect(typeof payload.occurredAt).toBe("string")
    expect(getSessionMetadata()).toEqual({ name: "Ada" })
  })

  it("creates an independent id for every event", () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()))
    vi.stubGlobal("fetch", fetchMock)

    trackObscurdleEvent("obscurdle:puzzle_started", { puzzleId: "puzzle-1" })
    trackObscurdleEvent("obscurdle:puzzle_ended", { puzzleId: "puzzle-1" })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>
    const first = JSON.parse(String(calls[0]![1].body)) as { eventId: string }
    const second = JSON.parse(String(calls[1]![1].body)) as { eventId: string }
    expect(first.eventId).not.toBe(second.eventId)
  })
})
