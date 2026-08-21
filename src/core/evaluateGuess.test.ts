import { describe, expect, it } from "vitest"
import { evaluateGuess } from "./evaluateGuess"

describe("evaluateGuess", () => {
  it.each([
    ["no t", "SCARE", ["absent", "present", "present", "absent", "absent"]],
    ["t1", "TXXXX", ["correct", "absent", "absent", "absent", "absent"]],
    ["t2", "XTXXX", ["absent", "present", "absent", "absent", "absent"]],
    ["t5", "XXXXT", ["absent", "absent", "absent", "absent", "correct"]],
    [
      "t1 + t2",
      "TTXXX",
      ["correct", "present", "absent", "absent", "absent"],
    ],
    [
      "t1 + t5",
      "TXXXT",
      ["correct", "absent", "absent", "absent", "correct"],
    ],
    [
      "t2 + t3",
      "XTTXX",
      ["absent", "present", "present", "absent", "absent"],
    ],
    [
      "t2 + t5",
      "XTXXT",
      ["absent", "present", "absent", "absent", "correct"],
    ],
  ])("scores TACIT: %s", (_scenario, guess, expected) => {
    expect(evaluateGuess(guess, "TACIT")).toEqual(expected)
  })

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
