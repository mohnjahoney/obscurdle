import { WORD_LENGTH, normalizeWord } from "./evaluateGuess"

let enabled = false
let target = ""
let checkAgainstList = true

export function devTargetEnabled(): boolean { return enabled }
export function devTarget(): string { return target }
export function devTargetOverride(): string | undefined {
  return enabled && target.length === WORD_LENGTH ? target : undefined
}
export function toggleDevTarget(): boolean {
  enabled = !enabled
  return enabled
}
export function setDevTarget(value: string): void {
  target = normalizeWord(value).slice(0, WORD_LENGTH)
}
export function appendDevTargetLetter(letterInput: string): string {
  if (!enabled || target.length >= WORD_LENGTH) return target
  const letter = normalizeWord(letterInput)
  if (/^[A-Z]$/.test(letter)) target += letter
  return target
}
export function removeDevTargetLetter(): string {
  target = target.slice(0, -1)
  return target
}

export function devListChecking(): boolean { return checkAgainstList }
export function toggleDevListChecking(): boolean {
  checkAgainstList = !checkAgainstList
  return checkAgainstList
}
