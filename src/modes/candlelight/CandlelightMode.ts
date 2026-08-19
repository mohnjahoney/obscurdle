import type { CandlelightModePresentationState } from "../../presentation/model/ModePresentationState"
import type { ModeContext, ObscuringMode } from "../ObscuringMode"
import { candleBurnStateAt, type CandleBurnState } from "./candleBurn"
import {
  sampleCandleSource,
  type CandleSourceSample,
} from "./candleSource"

export class CandlelightMode implements ObscuringMode {
  private active = true
  private startedAt = 0
  private elapsedSeconds = 0
  private noiseSeed = 0
  private state: CandleBurnState = candleBurnStateAt(0)
  private source: CandleSourceSample = sampleCandleSource(
    0,
    this.state,
    0,
  )

  constructor(private readonly random: () => number = Math.random) {}

  presentationState(): CandlelightModePresentationState {
    return {
      kind: "candlelight",
      active: this.active,
      noiseSeed: this.noiseSeed,
      burn: this.state,
      source: this.source,
    }
  }

  start(context: ModeContext): void {
    this.active = true
    this.startedAt = context.scene.time.now
    this.elapsedSeconds = 0
    this.noiseSeed = this.random() * 10_000
    this.state = candleBurnStateAt(0)
    this.source = sampleCandleSource(0, this.state, this.noiseSeed)
  }

  update(context: ModeContext): boolean {
    if (!this.active) return false

    const elapsed = context.scene.time.now - this.startedAt
    this.elapsedSeconds = elapsed / 1_000
    this.state = candleBurnStateAt(elapsed)
    this.source = sampleCandleSource(
      this.elapsedSeconds,
      this.state,
      this.noiseSeed,
    )
    return true
  }

  stop(): void {
    this.active = false
  }
}
