# OBSCURDLE — Open-Source Phaser 4 Build

## Your Role

Act as an experienced Phaser developer and thoughtful game-design collaborator.

Build an original, maintainable implementation of **OBSCURDLE** using the
open-source Phaser library. This is a normal local software project: all source,
configuration, tests, and build tooling must live in this repository and remain
fully editable.

Do not use Phaser Game Agent, Phaser AE, generated proprietary engine code, or
the compiled website export from the neighboring project as dependencies.

The architecture matters, but it must serve a game that is coherent and
pleasant to play. Favor clear, modest abstractions over speculative complexity.

---

## Technical Foundation

Use:

- Phaser 4.2.1 from npm
- TypeScript with strict type checking
- Vite
- Vitest for pure game-logic tests
- A conventional npm project with reproducible scripts

Do not introduce React or another UI framework unless a concrete requirement
later makes one necessary. Phaser should own the game canvas and its interactive
presentation. Ordinary HTML and CSS may provide the minimal page shell.

The initial application must be a static browser game with no backend.

Expected commands:

```sh
npm install
npm run dev
npm run test
npm run build
```

Pin important dependencies rather than relying on unbounded version ranges.

---

## Project Objective

OBSCURDLE begins with ordinary Wordle rules and then experiments with how the
player can access previously discovered information.

The deduction puzzle stays stable. Difficulty comes from presenting, altering,
moving, concealing, or damaging information the player has already earned.

The central design philosophy is:

> Keep the game logic stable.
>
> Continually experiment with new ways of presenting or obscuring information.

This project has two important goals:

1. Establish a coherent ink-on-paper visual direction that can be refined later
   without restructuring the game.
2. Establish an architecture in which substantially different obscuring modes
   can be added without tangling the Wordle rules or unrelated modes.

At this stage, architectural clarity and easy visual iteration are more
important than highly polished art direction.

---

## Core Gameplay

Implement standard Wordle-style rules:

- one hidden five-letter answer
- six guesses
- five letters per guess
- correct, present, and absent evaluation
- correct handling of repeated letters
- physical-keyboard input
- clickable or tappable on-screen keyboard
- backspace/delete and submit controls
- rejection of incomplete or invalid guesses
- standard win and loss conditions
- a clear way to start another puzzle

Keep the rules independent of Phaser, rendering, animation, and browser APIs.
The core should be deterministic when supplied with an answer and a sequence of
guesses.

Use a modest bundled word list for development. Keep answer selection and guess
validation behind small interfaces so a better word source can replace them
later.

---

## Architectural Direction

Use three broad layers:

### 1. Pure game core

Plain TypeScript containing:

- puzzle state
- guess evaluation
- validation
- progression through rows
- win/loss state
- word selection interfaces

This layer must not import Phaser.

### 2. Shared Phaser presentation

Reusable visual and interaction components such as:

- board layout
- tile view
- keyboard view
- paper backdrop
- input routing
- reveal animations
- shared tween/effect helpers

Presentation components consume style and layout values. They should not define
their own colors, fonts, borders, spacing, durations, or similar design
decisions.

### 3. Obscuring modes

Each mode owns its additional state, objects, animation, event handling, and
cleanup. A mode should not add fields to the core puzzle model merely because
its presentation needs them.

Begin with a small lifecycle along these lines, adapting it if Phaser suggests a
cleaner concrete design:

```ts
interface ObscuringMode {
  start(context: ModeContext): void
  onGuessSubmitted(context: ModeContext, row: number): void
  update(context: ModeContext, delta: number): void
  stop(context: ModeContext): void
}
```

Most modes should be able to work with a shared `PlayScene` and shared
presentation components. Do not create a separate Phaser Scene for every mode
by default.

However, do not make the shared board into a prison. A future mode may replace
the conventional board presentation, detach tiles, add independent objects, or
use a radically different layout. When a real mode requires that freedom,
introduce an appropriate presenter, factory, scene, or other localized
extension. Do not build a complicated general solution before it is needed.

Adding an ordinary new mode should require localized changes and one explicit
registration entry, not edits scattered throughout the application.

A likely starting structure is:

```text
src/
├── core/
│   ├── Puzzle.ts
│   ├── evaluateGuess.ts
│   ├── words.ts
│   └── *.test.ts
├── style/
│   ├── gameStyle.ts
│   ├── layout.ts
│   └── motion.ts
├── scenes/
│   ├── BootScene.ts
│   ├── MenuScene.ts
│   └── PlayScene.ts
├── presentation/
│   ├── BoardView.ts
│   ├── TileView.ts
│   ├── KeyboardView.ts
│   └── PaperBackdrop.ts
├── modes/
│   ├── ObscuringMode.ts
│   ├── PlainMode.ts
│   └── registry.ts
├── main.ts
└── styles.css
```

Treat this as guidance, not a requirement to manufacture one class per file.

---

## Style and Configuration Boundary

Visual decisions must be easy to find and change without searching through
scenes or presentation classes.

Phaser renders game objects inside a canvas, so CSS cannot style most of the
game directly. Use:

- CSS for the browser page, canvas container, page background, loading state,
  and other real HTML elements.
- Typed TypeScript style/config objects for Phaser-rendered colors, fonts,
  sizes, line widths, spacing, padding, corner treatments, depths, and states.
- Typed layout configuration for breakpoints, board geometry, keyboard
  geometry, margins, and responsive rules.
- Typed motion configuration for durations, delays, easing choices, and motion
  intensity.

Do not scatter unexplained visual literals through scenes, modes, or view
classes. A presentation component may calculate a value from its available
space, but the governing ratio, minimum, maximum, or token must come from the
central style or layout configuration.

For example:

```ts
export const GAME_STYLE = {
  color: {
    paper: 0xf3eedf,
    ink: 0x211f1a,
    mutedInk: 0x6d685d,
    rule: 0xaaa18d,
  },
  type: {
    displayFamily: "Georgia, 'Times New Roman', serif",
    bodyFamily: "Georgia, 'Times New Roman', serif",
  },
  tile: {
    borderWidth: 2,
    cornerRadius: 0,
  },
} as const
```

The example values are provisional, not a required final theme. Prefer semantic
names such as `paper`, `ink`, `rule`, `correct`, and `present` over names tied to
a particular hex value.

Mode-specific styling may live beside the mode in a clearly named config file
when it is genuinely local to that mode. Shared style decisions belong in the
central style directory. Game rules and puzzle state must never depend on a
theme value.

Changing the overall visual theme should primarily involve editing the style
and configuration files, plus CSS for the HTML shell—not rewriting scenes or
gameplay components.

---

## Visual and Art Direction

For the initial build, lean clearly toward **ink printed on paper**. The nearest
references are a newspaper puzzle page and a restrained literary or news
magazine—not a generic digital game interface.

Use a simple baseline vocabulary:

- warm off-white newsprint or uncoated paper
- dark charcoal or near-black ink
- thin printed rules and square or nearly square tile borders
- serif-forward typography
- sparse use of muted spot colors for puzzle results
- clear newspaper-like hierarchy
- restrained motion

The first milestone does not need sophisticated paper textures, custom fonts,
illustration, elaborate animation, or final art assets. Establish the direction
with typography, color, rules, spacing, and hierarchy. Keep it coherent and
readable, then stop. Do not spend substantial time polishing minor visual
details before the user has reviewed the basic game.

Later, this baseline can move toward newspaper, magazine, literary journal, or
another print direction by changing the centralized style configuration.
Obscuring effects should continue the physical metaphor: ink fades, paper
drifts, sunlight scorches it, shadows conceal it, or the printed page otherwise
becomes harder to read.

Avoid:

- generic neon game styling
- sci-fi HUD conventions
- gratuitous gradients
- noisy particle effects
- placeholder-looking panels
- excessive animation
- an arcade aesthetic

Use programmatic Phaser graphics, text, and small code-generated textures for
the first milestone. Do not block the build on an asset-production pipeline.
Keep every provisional visual decision centralized so it is cheap to replace.

The game must remain usable on a typical phone in portrait orientation and on a
desktop browser. Preserve comfortable hit targets and readable text. Choose a
scaling strategy intentionally and document it briefly.

---

## Planned Modes

These modes define the intended architectural range. They are **not** all part
of the first implementation milestone.

### Plain

A faithful, readable baseline with no obscuring.

### Fading Ink

After a submitted row is revealed, its printed letters gradually fade over
roughly 10–20 seconds until they become difficult to read.

### Magnifying Glass

A crafted brass magnifying glass moves slowly over the page and concentrates
sunlight onto submitted tiles. Repeated exposure browns and eventually scorches
the paper and ink.

This replaces the earlier “laser cannon” concept. It should feel material and
editorial, not futuristic.

### Drifting Tiles

Submitted tiles visually detach from the grid and gradually drift upward and
outward like scraps of paper or dust in sunlight. The logical puzzle board does
not change.

### Spotlight

Most of the page is dark. A soft circular region around the pointer or touch
location reveals the puzzle, requiring the player to inspect it actively.

Future modes may rotate or rearrange tiles, reinterpret colors, add temporary
reveals, introduce new interactions, or abandon the visible grid entirely.

---

## Milestone Plan

Work incrementally. Finish, test, and visually verify each milestone before
beginning the next.

### Milestone 0 — Project foundation

- Create the Phaser 4.2.1 + TypeScript + Vite project.
- Add strict type checking and Vitest.
- Establish development, test, and production-build scripts.
- Create the minimal page shell and responsive canvas setup.
- Add a short README with commands and architectural orientation.

Acceptance criteria:

- `npm run dev` starts the game.
- `npm run test` passes.
- `npm run build` produces a static production build.
- The browser console has no startup errors or warnings caused by our code.

### Milestone 1 — Functional Plain Mode with an adaptable print style

- Implement and thoroughly test the pure Wordle core.
- Implement the playable board and keyboard.
- Add title/menu, play, win/loss, and replay flow.
- Establish the centralized style/config boundary.
- Apply a coherent but intentionally provisional ink-on-paper/newspaper theme.
- Add restrained tile-entry and result-reveal motion.
- Verify physical keyboard, mouse, and touch interaction.
- Verify repeated-letter evaluation with unit tests.
- Verify representative phone and desktop layouts.

Acceptance criteria:

- A complete puzzle can be played from start to finish.
- Invalid and incomplete guesses are handled clearly.
- Repeated letters are evaluated correctly.
- The game can be replayed without reloading the page.
- No obscuring mode is required for this milestone.
- The presentation is coherent, readable, and recognizably print-inspired
  without pretending to be final visual design.
- Visual constants are centralized rather than embedded throughout scenes and
  components.
- Tests, type checking, and production build pass.

Stop after Milestone 1. Present the result for visual and gameplay review before
implementing any obscuring modes.

### Milestone 2 — Mode boundary

After Plain Mode is approved:

- Extract or confirm the smallest useful mode lifecycle.
- Register Plain Mode through that system.
- Add Fading Ink as the first real test of the boundary.
- Verify that no fading state leaks into the puzzle core.

### Milestone 3 — Modes with independent visual objects

- Add Magnifying Glass.
- Add Drifting Tiles.
- Refine shared helpers only in response to demonstrated duplication.

### Milestone 4 — Masking and alternative inspection

- Add Spotlight.
- Test pointer and touch behavior carefully.
- Review whether the existing mode boundary remains appropriate.

Do not implement Milestones 2–4 during the initial assignment.

---

## Testing and Verification

At minimum, unit-test:

- all-correct guesses
- all-absent guesses
- mixed correct/present/absent guesses
- repeated letters in the guess
- repeated letters in the answer
- guesses containing more copies of a letter than the answer
- row advancement
- win transition
- loss after the sixth guess
- rejection of guesses after completion

Keep visual behavior testable through small components and explicit state, but
do not build an elaborate testing framework for Phaser internals.

For every milestone:

- run tests
- run type checking
- run the production build
- open the game in a browser
- play through the affected flow
- inspect the console
- visually check phone and desktop sizes

Do not claim visual success based only on compilation.

---

## Working Style

- Make changes in small, understandable steps.
- Explain important architectural decisions and their tradeoffs.
- Prefer the simplest abstraction that satisfies the current milestone.
- Avoid copying architecture from React into Phaser.
- Avoid silent fallbacks that conceal errors.
- Keep configuration and visual tuning values discoverable.
- Do not add dependencies without a clear reason.
- Do not implement future modes merely to prove that the architecture is
  extensible.
- When visual judgment is involved, produce a working version, inspect it, and
  invite focused feedback.

If a requirement conflicts with Phaser’s natural model, explain the tension and
recommend the most idiomatic alternative before introducing a workaround.

---

## Initial Assignment

Implement **Milestone 0 and Milestone 1 only**.

Before writing code:

1. Inspect this prompt and the empty/fresh project directory.
2. Propose the concrete file structure and a concise implementation sequence.
3. Identify any decision that would materially change the player experience.

Then proceed unless a genuinely consequential ambiguity requires clarification.

When finished, provide:

- the working local game
- complete editable source
- passing tests
- a successful production build
- a concise architecture explanation
- a list of the most useful visual or gameplay questions for the next review

Do not begin Fading Ink, Magnifying Glass, Drifting Tiles, or Spotlight until
Plain Mode has been reviewed and approved.
