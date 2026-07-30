interface FlashlightDebugControlOptions {
  initialValue: number
  minimum: number
  maximum: number
  step: number
  onChange(value: number): void
}

export class FlashlightDebugControls {
  private readonly root: HTMLDivElement

  constructor(options: FlashlightDebugControlOptions) {
    const game = document.getElementById("game")
    if (!game) {
      throw new Error("Flashlight debug controls require the game container")
    }

    this.root = document.createElement("div")
    this.root.className = "flashlight-debug-control"

    const label = document.createElement("label")
    label.htmlFor = "flashlight-cone-information"
    label.textContent = "Cone information"

    const value = document.createElement("output")
    value.htmlFor = "flashlight-cone-information"

    const input = document.createElement("input")
    input.id = "flashlight-cone-information"
    input.type = "range"
    input.min = String(options.minimum)
    input.max = String(options.maximum)
    input.step = String(options.step)
    input.value = String(options.initialValue)

    const updateValue = () => {
      const nextValue = Number(input.value)
      value.value = `${(nextValue * 100).toFixed(1)}%`
      options.onChange(nextValue)
    }

    input.addEventListener("input", updateValue)
    updateValue()

    this.root.append(label, value, input)
    game.append(this.root)
  }

  destroy(): void {
    this.root.remove()
  }
}
