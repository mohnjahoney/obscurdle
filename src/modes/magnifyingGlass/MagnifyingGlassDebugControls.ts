interface MagnifyingGlassDebugControlOptions {
  initialValue: number
  minimum: number
  maximum: number
  step: number
  automaticMotionInitiallyEnabled: boolean
  onChange(value: number): void
  onAutomaticMotionChange(enabled: boolean): void
}

export class MagnifyingGlassDebugControls {
  private readonly root: HTMLDivElement

  constructor(options: MagnifyingGlassDebugControlOptions) {
    const game = document.getElementById("game")
    if (!game) {
      throw new Error(
        "Magnifying Glass debug controls require the game container",
      )
    }

    this.root = document.createElement("div")
    this.root.className = "magnifying-glass-debug-control"

    const inputId = "magnifying-glass-burn-rate"
    const label = document.createElement("label")
    label.htmlFor = inputId
    label.textContent = "Burn rate"

    const value = document.createElement("output")
    value.htmlFor = inputId

    const input = document.createElement("input")
    input.className = "debug-slider"
    input.id = inputId
    input.type = "range"
    input.min = String(options.minimum)
    input.max = String(options.maximum)
    input.step = String(options.step)
    input.value = String(options.initialValue)

    const updateValue = () => {
      const nextValue = Number(input.value)
      value.value = nextValue.toFixed(1)
      options.onChange(nextValue)
    }

    input.addEventListener("input", updateValue)
    updateValue()

    const motionLabel = document.createElement("label")
    motionLabel.className = "debug-toggle-row"

    const motionToggle = document.createElement("input")
    motionToggle.type = "checkbox"
    motionToggle.checked = options.automaticMotionInitiallyEnabled
    motionToggle.addEventListener("change", () => {
      options.onAutomaticMotionChange(motionToggle.checked)
    })

    const motionText = document.createElement("span")
    motionText.textContent = "Automatic motion"
    motionLabel.append(motionToggle, motionText)

    this.root.append(label, value, input, motionLabel)
    game.append(this.root)
  }

  destroy(): void {
    this.root.remove()
  }
}
