# Word lists

These lists were downloaded from
[`stuartpb/wordles`](https://github.com/stuartpb/wordles) on 2026-07-30.
That project says the lists were extracted from the JavaScript loaded by the
New York Times Wordle page.

- `nytAnswers.json` mirrors the repository's `wordles.json`: 2,309 candidate
  solution words in source order.
- `nytAdditionalGuesses.json` mirrors `nonwordles.json`: 10,638 accepted
  guesses that are not in the answer list.

`src/core/words.ts` combines both files for guess validation while drawing
answers only from `nytAnswers.json`.

The New York Times changes and curates Wordle's vocabulary over time. These
files are a versioned local snapshot, not a promise that they remain identical
to the live game.
