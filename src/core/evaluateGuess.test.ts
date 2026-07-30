import { describe, expect, it } from "vitest"
import { evaluateGuess } from "./evaluateGuess"

describe("evaluateGuess", () => {
  it("marks an all-correct guess", () => {
    expect(evaluateGuess("APPLE", "APPLE")).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ])
  })

  it("marks an all-absent guess", () => {
    expect(evaluateGuess("MOUND", "SPIRE")).toEqual([
      "absent",
      "absent",
      "absent",
      "absent",
      "absent",
    ])
  })

  it("marks a mixed result", () => {
    expect(evaluateGuess("CRANE", "REACT")).toEqual([
      "present",
      "present",
      "correct",
      "absent",
      "present",
    ])
  })

  it("does not award more repeated letters than the answer contains", () => {
    expect(evaluateGuess("APPLE", "ALERT")).toEqual([
      "correct",
      "absent",
      "absent",
      "present",
      "present",
    ])
  })

  it("handles repeated letters in the answer", () => {
    expect(evaluateGuess("LEMON", "LEVEL")).toEqual([
      "correct",
      "correct",
      "absent",
      "absent",
      "absent",
    ])
  })

  it("reserves exact matches before assigning present matches", () => {
    expect(evaluateGuess("SHEEP", "EERIE")).toEqual([
      "absent",
      "absent",
      "present",
      "present",
      "absent",
    ])
  })
})
