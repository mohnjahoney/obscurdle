# OBSCURDLE

An editable, open-source Phaser 4 implementation of OBSCURDLE.

## Commands

```sh
npm install
npm run dev
npm run test
npm run typecheck
npm run build
```

## Architecture

- `src/core/` contains the deterministic Wordle rules. It has no Phaser or
  browser dependencies and is covered by unit tests.
- `src/presentation/` contains reusable Phaser views for the paper, board,
  tiles, keyboard, and buttons.
- `src/modes/` contains the mode lifecycle, registry, and mode-local behavior
  and configuration.
- `src/scenes/` owns navigation and coordinates the core with the presentation.
- `src/style/` is the single source of truth for canvas-rendered visual,
  layout, and motion decisions.
- `src/styles.css` styles only the HTML page shell and canvas container.

The game uses a fixed 430 × 760 design coordinate system with Phaser's `FIT`
scaling. This preserves one predictable composition while scaling fluidly to a
phone viewport or a centered desktop page.

## Modes

The current v0 menu contains these playable editions:

- Misprint marks absent letters with a red editorial strike and present letters
  with a yellow highlighter.
- Fading Ink keeps submitted letters legible through a grace period, then fades
  them over a fixed duration. Its timing lives in `src/modes/fadingInkConfig.ts`.
- Sneaking Tiles moves one submitted tile at a time through a short,
  deterministic-looking hesitation/creep/pause cycle.
- Magnifying Glass follows a lens over the page and gradually burns through the
  covered paper or tile.
- Flashlight reveals the board through a moving cone of light while keeping the
  keyboard readable.
- Candlelight reveals the page through a warm, evolving pool of light.
- Plain keeps every submitted row fully visible.

Laser Blast is intentionally not included in v0: it has no settled interaction
design or presentation model yet, so it remains a post-v0 concept rather than an
unfinished menu item.

## Presentation options

The play screen supports two independent presentation toggles:

- Board: `TILES` uses the conventional colored tiles; `LETTERS` uses the bare
  typewriter-like letter treatment.
- Keys: `DIGITAL` uses flat keycaps; `TYPEWRITER` uses round vintage keycaps.

Both options are shared across the obscuring modes and persist between puzzles.
The bare-letter treatment carries the mode result through editorial marks and
the brighter success ink, while the obscuring effects remain responsible only
for what can currently be seen.

Submitted tiles use a temporary, Phaser-native ink-bloom shader before settling
into their ordinary gray, yellow, or green state. The implementation and source
inspiration are documented in `src/presentation/inkBloom.ts`.

The production build does not expose the temporary tuning controls used while
developing the flashlight, magnifying-glass, and fading-ink effects. Their
configuration remains available in source for future balancing work.

The bundled development dictionary is intentionally modest. `WordSource`
isolates answer selection and validation so it can be replaced without changing
the puzzle engine.
