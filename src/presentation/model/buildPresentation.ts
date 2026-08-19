import { MAX_GUESSES, type PuzzleState } from "../../core/Puzzle"
import {
  WORD_LENGTH,
  type LetterResult,
} from "../../core/evaluateGuess"
import { FADING_INK_CONFIG } from "../../modes/fadingInkConfig"
import {
  letterInkAlphaAt,
  rowFadeStartsAt,
} from "../../modes/fadingInkSchedule"
import { MISPRINT_CONFIG } from "../../modes/misprint/misprintConfig"
import { sampleSneakingTileMotion } from "../../modes/sneakingTiles/sneakingTileMotion"
import type { PresentationConfiguration } from "./PresentationConfiguration"
import type {
  FadingInkModePresentationState,
  ModePresentationState,
  SneakingTilesModePresentationState,
} from "./ModePresentationState"
import type {
  KeyboardPresentationModel,
  PresentationModel,
  BoardPresentationModel,
  LetterCellPresentationModel,
} from "./PresentationModel"
import { resolveLetterBasePlacement } from "../board/boardLayout"
import { editorialLetter } from "../board/editorialEvaluation"
import { GAME_LAYOUT } from "../../style/layout"

const EVALUATION_RANK: Record<LetterResult, number> = {
  absent: 1,
  present: 2,
  correct: 3,
}

function emptyCell(): LetterCellPresentationModel {
  return { letter: "", baseX: 0, baseY: 0 }
}

function buildBoard(
  puzzle: PuzzleState,
  configuration: PresentationConfiguration,
): BoardPresentationModel {
  const rows = Array.from({ length: MAX_GUESSES }, () =>
    Array.from({ length: WORD_LENGTH }, emptyCell),
  )

  puzzle.guesses.forEach((guess, row) => {
    for (let column = 0; column < WORD_LENGTH; column += 1) {
      const letter = guess.word[column]
      const evaluation = guess.evaluation[column]
      if (letter && evaluation) {
        rows[row]![column] = {
          letter:
            configuration.board === "bare"
              ? editorialLetter(letter, evaluation)
              : letter,
          evaluation,
          baseX: 0,
          baseY: 0,
        }
      }
    }
  })

  const currentRow = rows[puzzle.guesses.length]
  if (currentRow) {
    for (let column = 0; column < WORD_LENGTH; column += 1) {
      currentRow[column] = {
        letter:
          configuration.board === "bare"
            ? editorialLetter(puzzle.currentGuess[column] ?? "")
            : puzzle.currentGuess[column] ?? "",
        baseX: 0,
        baseY: 0,
      }
    }
  }

  rows.forEach((row, rowIndex) => {
    const word = row.map((cell) => cell.letter).join("")
    row.forEach((cell, column) => {
      const placement = resolveLetterBasePlacement(
        configuration.board,
        rowIndex,
        column,
        word,
      )
      cell.baseX = placement.x
      cell.baseY = placement.y
    })
  })

  return { kind: configuration.board, rows, fadeStartMarkers: [] }
}

function applyFadingInk(
  board: BoardPresentationModel,
  mode: FadingInkModePresentationState,
  now: number,
): BoardPresentationModel {
  const rows = board.rows.map((row) => row.map((cell) => ({ ...cell })))

  for (const schedule of mode.rows) {
    const row = rows[schedule.row]
    if (!row) continue

    row.forEach((cell, column) => {
      cell.inkAlpha = letterInkAlphaAt(schedule, column, now)
    })
  }

  const fadeStartMarkers = FADING_INK_CONFIG.debugFadeStartMarker.enabled
    ? mode.rows.map((schedule) => {
        const finalCell = rows[schedule.row]?.[WORD_LENGTH - 1]
        return {
          row: schedule.row,
          visible: now >= rowFadeStartsAt(schedule),
          x:
            (finalCell?.baseX ?? GAME_LAYOUT.width / 2) +
            GAME_LAYOUT.board.tileSize / 2 +
            FADING_INK_CONFIG.debugFadeStartMarker.offsetFromBoard,
          y: finalCell?.baseY ?? GAME_LAYOUT.board.top,
        }
      })
    : []

  return { ...board, rows, fadeStartMarkers }
}

function applySneakingTiles(
  board: BoardPresentationModel,
  mode: SneakingTilesModePresentationState,
  now: number,
): BoardPresentationModel {
  const rows = board.rows.map((row) => row.map((cell) => ({ ...cell })))

  for (const motion of mode.motions) {
    const cell = rows[motion.row]?.[motion.column]
    if (!cell) continue
    const sample = sampleSneakingTileMotion(motion, now)
    cell.offsetX = sample.offsetX
    cell.depthOffset = sample.depthOffset
  }

  return { ...board, rows }
}

function applyMisprint(
  board: BoardPresentationModel,
): BoardPresentationModel {
  const rows = board.rows.map((row) =>
    row.map((cell) =>
      cell.evaluation
        ? {
            ...cell,
            letterLegibleProgress: MISPRINT_CONFIG.letterLegibleProgress,
            reportLetterLegible: true,
          }
        : { ...cell },
    ),
  )
  return { ...board, rows }
}

function buildKeyboard(
  puzzle: PuzzleState,
  configuration: PresentationConfiguration,
  includeCell: (row: number, column: number) => boolean = () => true,
): KeyboardPresentationModel {
  const evaluations: Partial<Record<string, LetterResult>> = {}

  puzzle.guesses.forEach((guess, row) => {
    guess.word.split("").forEach((letter, index) => {
      if (!includeCell(row, index)) return
      const result = guess.evaluation[index]
      const previous = evaluations[letter]
      if (
        result &&
        (!previous || EVALUATION_RANK[result] > EVALUATION_RANK[previous])
      ) {
        evaluations[letter] = result
      }
    })
  })

  return {
    kind: configuration.keyboard,
    evaluations,
  }
}

export function buildPresentation(
  puzzle: PuzzleState,
  configuration: PresentationConfiguration,
  mode: ModePresentationState,
  now: number,
): PresentationModel {
  const baseBoard = buildBoard(puzzle, configuration)
  const misprintLegibleCells =
    mode.kind === "misprint"
      ? new Set(
          mode.legibleCells.map(({ row, column }) => `${row}:${column}`),
        )
      : undefined
  const stablePresentation = {
    page: { kind: "paper" } as const,
    masthead: {
      title: "OBSCURDLE",
      deck: "Keep the puzzle. Change what can be seen.",
    },
    keyboard: buildKeyboard(
      puzzle,
      configuration,
      misprintLegibleCells
        ? (row, column) => misprintLegibleCells.has(`${row}:${column}`)
        : undefined,
    ),
    effect: { kind: "none" } as const,
  }

  switch (mode.kind) {
    case "plain":
      return {
        ...stablePresentation,
        board: baseBoard,
        footer: {
          text: "PLAIN EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
        },
      }
    case "fading-ink":
      return {
        ...stablePresentation,
        board: applyFadingInk(baseBoard, mode, now),
        footer: {
          text: "FADING INK EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
        },
      }
    case "sneaking-tiles":
      return {
        ...stablePresentation,
        board: applySneakingTiles(baseBoard, mode, now),
        footer: {
          text: "SNEAKING TILES EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
        },
      }
    case "misprint":
      return {
        ...stablePresentation,
        board: applyMisprint(baseBoard),
        footer: {
          text: "MISPRINT EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
        },
      }
    case "flashlight":
      return {
        ...stablePresentation,
        board: baseBoard,
        effect: mode.active
          ? {
              kind: "flashlight",
              distribution: mode.distribution,
              target: mode.target,
              timeSeconds: now / 1_000,
              uniformOverrides: mode.uniformOverrides,
            }
          : { kind: "none" },
        footer: {
          text: "FLASHLIGHT EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
        },
      }
    case "candlelight":
      return {
        ...stablePresentation,
        board: baseBoard,
        effect: mode.active
          ? {
              kind: "candlelight",
              noiseSeed: mode.noiseSeed,
              timeSeconds: now / 1_000,
              burn: mode.burn,
              source: mode.source,
            }
          : { kind: "none" },
        footer: {
          text: "CANDLELIGHT EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
        },
      }
    case "magnifying-glass":
      return {
        ...stablePresentation,
        board: baseBoard,
        effect: mode.active
          ? {
              kind: "magnifying-glass",
              position: mode.position,
              burnRate: mode.burnRate,
              automaticMotion: mode.automaticMotion,
              burns: mode.burns,
              paperBurn: mode.paperBurn,
              timeMs: now,
            }
          : { kind: "none" },
        footer: {
          text: "MAGNIFYING GLASS EDITION  ·  SIX GUESSES  ·  FIVE LETTERS",
        },
      }
  }
}
