import { describe, expect, it } from "vitest"
import {
  menuStateFromHistory,
  playModeFromHistory,
} from "./browserHistory"

describe("browser history state", () => {
  it("recognizes the front page", () => {
    expect(menuStateFromHistory({ obscurdleScreen: "menu" })).toBe(true)
    expect(menuStateFromHistory({ obscurdleScreen: "play" })).toBe(false)
    expect(menuStateFromHistory(null)).toBe(false)
  })

  it("returns only registered modes from play states", () => {
    expect(
      playModeFromHistory({
        obscurdleScreen: "play",
        modeId: "candlelight",
      }),
    ).toBe("candlelight")
    expect(
      playModeFromHistory({
        obscurdleScreen: "play",
        modeId: "unknown-mode",
      }),
    ).toBeUndefined()
    expect(playModeFromHistory({ obscurdleScreen: "menu" })).toBeUndefined()
  })
})
