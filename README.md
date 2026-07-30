# OBSCURDLE — fresh Phaser build

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

- Plain keeps every submitted row fully visible.
- Fading Ink gives each submitted letter a short random start delay, then fades
  its ink for a fixed duration. Its timing lives in
  `src/modes/fadingInkConfig.ts`.

Submitted tiles use a temporary, Phaser-native ink-bloom shader before settling
into their ordinary gray, yellow, or green state. The implementation and source
inspiration are documented in `src/presentation/inkBloom.ts`.

The bundled development dictionary is intentionally modest. `WordSource`
isolates answer selection and validation so it can be replaced without changing
the puzzle engine.
