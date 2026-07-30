import type { ModeContext, ObscuringMode } from "./ObscuringMode"

export class PlainMode implements ObscuringMode {
  start(_context: ModeContext): void {}

  onGuessSubmitted(_context: ModeContext, _row: number): void {}

  update(_context: ModeContext): void {}

  stop(_context: ModeContext): void {}
}

