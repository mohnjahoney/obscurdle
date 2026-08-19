import type { ModeContext, ObscuringMode } from "./ObscuringMode"
import type { PlainModePresentationState } from "../presentation/model/ModePresentationState"

export class PlainMode implements ObscuringMode {
  presentationState(): PlainModePresentationState {
    return { kind: "plain" }
  }

  start(_context: ModeContext): void {}

  update(_context: ModeContext): boolean {
    return false
  }

  stop(_context: ModeContext): void {}
}
