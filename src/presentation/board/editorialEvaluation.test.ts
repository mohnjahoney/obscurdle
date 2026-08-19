import { describe, expect, it } from "vitest"
import type { LetterResult } from "../../core/evaluateGuess"
import type { LetterCellPresentationModel } from "../model/PresentationModel"
import {
  editorialLetter,
  editorialWord,
  findEditorialAnnotationRuns,
} from "./editorialEvaluation"

function evaluatedRow(
  evaluations: readonly LetterResult[],
): LetterCellPresentationModel[] {
  return evaluations.map((evaluation, column) => ({
    letter: "alert"[column]!,
    evaluation,
    baseX: column * 20,
    baseY: 0,
  }))
}

describe("editorial evaluation", () => {
  it("keeps every bare-board letter lowercase", () => {
    expect(editorialLetter("a")).toBe("a")
    expect(editorialLetter("B", "absent")).toBe("b")
    expect(editorialLetter("c", "present")).toBe("c")
    expect(editorialLetter("d", "correct")).toBe("d")
    expect(
      editorialWord("ALERT", [
        "absent",
        "present",
        "correct",
        "present",
        "correct",
      ]),
    ).toBe("alert")
  })

  it("joins adjacent matching marks and lets correct letters split runs", () => {
    const runs = findEditorialAnnotationRuns(
      evaluatedRow(["absent", "absent", "correct", "present", "present"]),
    )

    expect(runs).toEqual([
      { result: "absent", startColumn: 0, endColumn: 1 },
      { result: "present", startColumn: 3, endColumn: 4 },
    ])
  })

  it("starts a new gesture when adjacent results use different marks", () => {
    const runs = findEditorialAnnotationRuns(
      evaluatedRow(["absent", "present", "absent", "correct", "absent"]),
    )

    expect(runs).toEqual([
      { result: "absent", startColumn: 0, endColumn: 0 },
      { result: "present", startColumn: 1, endColumn: 1 },
      { result: "absent", startColumn: 2, endColumn: 2 },
      { result: "absent", startColumn: 4, endColumn: 4 },
    ])
  })
})
