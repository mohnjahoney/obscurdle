import { describe, expect, it } from "vitest"
import type { PuzzleState } from "../../core/Puzzle"
import { FADING_INK_CONFIG } from "../../modes/fadingInkConfig"
import { candleBurnStateAt } from "../../modes/candlelight/candleBurn"
import { sampleCandleSource } from "../../modes/candlelight/candleSource"
import { buildPresentation } from "./buildPresentation"

function puzzleState(overrides: Partial<PuzzleState> = {}): PuzzleState {
  return {
    answer: "CIGAR",
    currentGuess: "",
    guesses: [],
    status: "playing",
    ...overrides,
  }
}

describe("buildPresentation", () => {
  it("selects the board and keyboard presentations independently", () => {
    const presentation = buildPresentation(
      puzzleState({ currentGuess: "INK" }),
      { board: "bare", keyboard: "vintage-typewriter" },
      { kind: "plain" },
      500,
    )

    expect(presentation.board.kind).toBe("bare")
    expect(presentation.board.rows[0]?.map((cell) => cell.letter)).toEqual([
      "i",
      "n",
      "k",
      "",
      "",
    ])
    expect(presentation.keyboard.kind).toBe("vintage-typewriter")
  })

  it("keeps evaluated bare-board letters lowercase", () => {
    const presentation = buildPresentation(
      puzzleState({
        guesses: [
          {
            word: "ALERT",
            evaluation: ["absent", "present", "correct", "present", "correct"],
          },
        ],
      }),
      { board: "bare", keyboard: "digital" },
      { kind: "plain" },
      500,
    )

    expect(presentation.board.rows[0]?.map((cell) => cell.letter)).toEqual([
      "a",
      "l",
      "e",
      "r",
      "t",
    ])
  })

  it("builds the entire stable Plain view from state and configuration", () => {
    const presentation = buildPresentation(
      puzzleState({ currentGuess: "CR" }),
      { board: "tiles", keyboard: "vintage-typewriter" },
      { kind: "plain" },
      1_000,
    )

    expect(presentation.page).toEqual({ kind: "paper" })
    expect(presentation.masthead).toEqual({
      title: "OBSCURDLE",
      deck: "Keep the puzzle. Change what can be seen.",
    })
    expect(presentation.board.rows).toHaveLength(6)
    expect(presentation.board.rows[0]?.map((cell) => cell.letter)).toEqual([
      "C",
      "R",
      "",
      "",
      "",
    ])
    expect(presentation.keyboard.kind).toBe("vintage-typewriter")
    expect(presentation.footer.text).toBe(
      "PLAIN EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
    )
  })

  it("projects submitted guesses and keeps the strongest keyboard result", () => {
    const presentation = buildPresentation(
      puzzleState({
        currentGuess: "A",
        guesses: [
          {
            word: "ALERT",
            evaluation: ["present", "absent", "absent", "absent", "absent"],
          },
          {
            word: "CROAK",
            evaluation: ["correct", "present", "absent", "correct", "absent"],
          },
        ],
      }),
      { board: "tiles", keyboard: "digital" },
      { kind: "plain" },
      2_000,
    )

    expect(presentation.board.rows[0]?.[0]).toMatchObject({
      letter: "A",
      evaluation: "present",
    })
    expect(presentation.board.rows[1]?.[0]).toMatchObject({
      letter: "C",
      evaluation: "correct",
    })
    expect(presentation.board.rows[2]?.[0]).toMatchObject({ letter: "A" })
    expect(presentation.keyboard.evaluations.A).toBe("correct")
    expect(presentation.keyboard.evaluations.C).toBe("correct")
  })

  it("projects Fading Ink opacity and marker visibility from mode state and time", () => {
    const submittedAt = 1_000
    const firstLetterDelay = 500
    const fadeStartsAt =
      submittedAt + FADING_INK_CONFIG.gracePeriodMs + firstLetterDelay
    const state = puzzleState({
      guesses: [
        {
          word: "ALERT",
          evaluation: ["present", "absent", "absent", "absent", "absent"],
        },
      ],
    })
    const mode = {
      kind: "fading-ink" as const,
      rows: [
        {
          row: 0,
          submittedAt,
          letterStartDelaysMs: [firstLetterDelay, 1_000, 1_500, 2_000, 2_500],
        },
      ],
    }

    const beforeFade = buildPresentation(
      state,
      { board: "tiles", keyboard: "digital" },
      mode,
      fadeStartsAt - 1,
    )
    expect(beforeFade.board.rows[0]?.[0]?.inkAlpha).toBe(1)
    expect(beforeFade.board.fadeStartMarkers).toEqual([])

    const midway = buildPresentation(
      state,
      { board: "tiles", keyboard: "digital" },
      mode,
      fadeStartsAt + FADING_INK_CONFIG.fadeDurationMs / 2,
    )
    expect(midway.board.rows[0]?.[0]?.inkAlpha).toBe(0.5)
    expect(midway.board.rows[0]?.[1]?.inkAlpha).toBeCloseTo(0.5167, 3)
    expect(midway.board.fadeStartMarkers).toEqual([])
    expect(midway.footer.text).toBe(
      "FADING INK EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
    )
  })

  it("projects Sneaking Tiles motion as a horizontal cell transform", () => {
    const presentation = buildPresentation(
      puzzleState({
        guesses: [
          {
            word: "ALERT",
            evaluation: ["present", "absent", "absent", "absent", "absent"],
          },
        ],
      }),
      { board: "tiles", keyboard: "digital" },
      {
        kind: "sneaking-tiles",
        motions: [
          {
            row: 0,
            column: 1,
            segments: [
              {
                startsAt: 1_000,
                durationMs: 2_000,
                fromOffsetX: 0,
                toOffsetX: -20,
              },
            ],
          },
        ],
      },
      2_000,
    )

    expect(presentation.board.rows[0]?.[0]?.offsetX).toBeUndefined()
    const sneakingCell = presentation.board.rows[0]?.[1]
    expect(sneakingCell).toMatchObject({
      letter: "L",
      depthOffset: -1,
    })
    expect(sneakingCell?.offsetX).toBeCloseTo(-10)
    expect(sneakingCell?.baseX).toBeGreaterThan(0)
    expect(sneakingCell?.baseY).toBeGreaterThan(0)
    expect(presentation.footer.text).toBe(
      "SNEAKING TILES EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
    )
  })

  it("reveals Misprint keyboard evaluations only as letters become legible", () => {
    const presentation = buildPresentation(
      puzzleState({
        guesses: [
          {
            word: "ALIEN",
            evaluation: ["present", "absent", "correct", "absent", "absent"],
          },
        ],
      }),
      { board: "tiles", keyboard: "digital" },
      {
        kind: "misprint",
        displayWords: [{ row: 0, word: "ALERT" }],
        legibleCells: [
          { row: 0, column: 0 },
          { row: 0, column: 2 },
        ],
      },
      2_000,
    )

    expect(presentation.board.rows[0]?.[0]).toMatchObject({
      letter: "A",
      reportLetterLegible: true,
      letterLegibleProgress: 0.1,
    })
    expect(presentation.keyboard.evaluations).toEqual({
      A: "present",
      I: "correct",
    })
    expect(presentation.footer.text).toBe(
      "MISPRINT EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
    )
  })

  it("renders Misprint letters separately from the actual scored word", () => {
    const evaluation = ["absent", "present", "correct", "absent", "correct"] as const
    const presentation = buildPresentation(
      puzzleState({
        guesses: [{ word: "CRATE", evaluation: [...evaluation] }],
      }),
      { board: "tiles", keyboard: "digital" },
      {
        kind: "misprint",
        displayWords: [{ row: 0, word: "CRANE" }],
        legibleCells: [
          { row: 0, column: 0 },
          { row: 0, column: 1 },
          { row: 0, column: 2 },
          { row: 0, column: 3 },
          { row: 0, column: 4 },
        ],
      },
      2_000,
    )

    expect(presentation.board.rows[0]?.map((cell) => cell.letter)).toEqual([
      "C",
      "R",
      "A",
      "N",
      "E",
    ])
    expect(presentation.board.rows[0]?.map((cell) => cell.evaluation)).toEqual([
      ...evaluation,
    ])
    expect(presentation.keyboard.evaluations).toEqual({
      C: "absent",
      R: "present",
      A: "correct",
      T: "absent",
      E: "correct",
    })
    expect(presentation.keyboard.evaluations.N).toBeUndefined()
  })

  it("projects Flashlight controller state as a whole-view effect", () => {
    const presentation = buildPresentation(
      puzzleState(),
      { board: "tiles", keyboard: "digital" },
      {
        kind: "flashlight",
        active: true,
        distribution: "material-cone",
        target: [0.25, 0.4],
        uniformOverrides: { uSpillStrength: 0.02 },
      },
      2_500,
    )

    expect(presentation.effect).toEqual({
      kind: "flashlight",
      distribution: "material-cone",
      target: [0.25, 0.4],
      timeSeconds: 2.5,
      uniformOverrides: { uSpillStrength: 0.02 },
    })
    expect(presentation.footer.text).toBe(
      "FLASHLIGHT EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
    )

    const stopped = buildPresentation(
      puzzleState(),
      { board: "tiles", keyboard: "digital" },
      {
        kind: "flashlight",
        active: false,
        distribution: "material-cone",
        target: [0.25, 0.4],
        uniformOverrides: {},
      },
      3_000,
    )
    expect(stopped.effect).toEqual({ kind: "none" })
  })

  it("projects Candlelight controller state as a whole-view effect", () => {
    const burn = candleBurnStateAt(30_000)
    const source = sampleCandleSource(30, burn, 1_234)
    const presentation = buildPresentation(
      puzzleState(),
      { board: "tiles", keyboard: "digital" },
      {
        kind: "candlelight",
        active: true,
        noiseSeed: 1_234,
        burn,
        source,
      },
      32_500,
    )

    expect(presentation.effect).toEqual({
      kind: "candlelight",
      noiseSeed: 1_234,
      timeSeconds: 32.5,
      burn,
      source,
    })
    expect(presentation.footer.text).toBe(
      "CANDLELIGHT EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
    )

    const stopped = buildPresentation(
      puzzleState(),
      { board: "tiles", keyboard: "digital" },
      {
        kind: "candlelight",
        active: false,
        noiseSeed: 1_234,
        burn,
        source,
      },
      33_000,
    )
    expect(stopped.effect).toEqual({ kind: "none" })
  })

  it("projects Magnifying Glass motion and burn state as a whole-view effect", () => {
    const heat = new Float32Array(14 * 14)
    heat[42] = 0.75
    const burns = [
      { row: 1, column: 2, seed: 80, heat, version: 3 },
    ]
    const paperBurn = {
      heat: new Float32Array(8),
      version: 2,
      seed: 2_741,
      columns: 4,
      rows: 2,
    }
    const presentation = buildPresentation(
      puzzleState(),
      { board: "tiles", keyboard: "digital" },
      {
        kind: "magnifying-glass",
        active: true,
        position: { x: 180, y: 270 },
        burnRate: 4.4,
        automaticMotion: false,
        burns,
        paperBurn,
      },
      12_500,
    )

    expect(presentation.effect).toEqual({
      kind: "magnifying-glass",
      position: { x: 180, y: 270 },
      burnRate: 4.4,
      automaticMotion: false,
      burns,
      paperBurn,
      timeMs: 12_500,
    })
    expect(presentation.footer.text).toBe(
      "MAGNIFYING GLASS EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
    )
  })
})
