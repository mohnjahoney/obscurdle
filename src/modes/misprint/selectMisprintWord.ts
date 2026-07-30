import { normalizeWord, WORD_LENGTH } from "../../core/evaluateGuess"

export interface MisprintSelection {
  enteredWord: string
  answer: string
  allowedWords: Iterable<string>
  submittedWords: Iterable<string>
  preferredDistance?: number
  maximumDistance?: number
  random?: () => number
}

export function hammingDistance(left: string, right: string): number {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY

  let distance = 0
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) distance += 1
  }
  return distance
}

export function selectMisprintWord({
  enteredWord: enteredInput,
  answer: answerInput,
  allowedWords,
  submittedWords,
  preferredDistance = 1,
  maximumDistance = 2,
  random = Math.random,
}: MisprintSelection): string {
  const enteredWord = normalizeWord(enteredInput)
  const answer = normalizeWord(answerInput)

  // A player who found the answer keeps the win they earned.
  if (enteredWord === answer) return enteredWord

  const excluded = new Set(Array.from(submittedWords, normalizeWord))
  excluded.add(enteredWord)
  excluded.add(answer)

  const candidatesByDistance = new Map<number, string[]>()
  for (const candidateInput of allowedWords) {
    const candidate = normalizeWord(candidateInput)
    if (candidate.length !== WORD_LENGTH || excluded.has(candidate)) continue

    const distance = hammingDistance(enteredWord, candidate)
    if (distance < preferredDistance || distance > maximumDistance) continue

    const candidates = candidatesByDistance.get(distance) ?? []
    if (!candidates.includes(candidate)) candidates.push(candidate)
    candidatesByDistance.set(distance, candidates)
  }

  for (let distance = preferredDistance; distance <= maximumDistance; distance += 1) {
    const candidates = candidatesByDistance.get(distance)
    if (!candidates?.length) continue

    const index = Math.min(
      candidates.length - 1,
      Math.max(0, Math.floor(random() * candidates.length)),
    )
    return candidates[index] ?? enteredWord
  }

  return enteredWord
}
