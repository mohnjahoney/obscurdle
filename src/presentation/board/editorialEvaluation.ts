import type { LetterResult } from "../../core/evaluateGuess"
import type { LetterCellPresentationModel } from "../model/PresentationModel"

export type EditorialAnnotationResult = Extract<
  LetterResult,
  "absent" | "present"
>

export interface EditorialAnnotationRun {
  result: EditorialAnnotationResult
  startColumn: number
  endColumn: number
}

export function editorialLetter(
  letter: string,
  _evaluation?: LetterResult,
): string {
  return letter.toLowerCase()
}

export function editorialWord(
  word: string,
  evaluation?: readonly LetterResult[],
): string {
  return word
    .split("")
    .map((letter, column) => editorialLetter(letter, evaluation?.[column]))
    .join("")
}

export function findEditorialAnnotationRuns(
  row: readonly LetterCellPresentationModel[],
): EditorialAnnotationRun[] {
  const runs: EditorialAnnotationRun[] = []
  let active: EditorialAnnotationRun | undefined

  row.forEach((cell, column) => {
    const result =
      cell.evaluation === "absent" || cell.evaluation === "present"
        ? cell.evaluation
        : undefined

    if (!result) {
      if (active) runs.push(active)
      active = undefined
      return
    }

    if (active?.result === result && active.endColumn === column - 1) {
      active.endColumn = column
      return
    }

    if (active) runs.push(active)
    active = { result, startColumn: column, endColumn: column }
  })

  if (active) runs.push(active)
  return runs
}
