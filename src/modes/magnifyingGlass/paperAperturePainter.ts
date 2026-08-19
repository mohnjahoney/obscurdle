import { MAGNIFYING_GLASS_CONFIG } from "./magnifyingGlassConfig"

function smoothStep(start: number, end: number, value: number): number {
  const amount = Math.min(Math.max((value - start) / (end - start), 0), 1)
  return amount * amount * (3 - 2 * amount)
}

function cellVariation(seed: number, index: number): number {
  const value = Math.sin(seed * 41.7 + index * 127.1) * 43_758.5453
  return 0.82 + (value - Math.floor(value)) * 0.36
}

function colorChannel(color: number, shift: number): number {
  return (color >> shift) & 0xff
}

interface RgbColor {
  red: number
  green: number
  blue: number
}

function rgb(color: number): RgbColor {
  return {
    red: colorChannel(color, 16),
    green: colorChannel(color, 8),
    blue: colorChannel(color, 0),
  }
}

function mixColor(
  first: RgbColor,
  second: RgbColor,
  amount: number,
): RgbColor {
  const mix = (start: number, end: number) =>
    Math.round(start + (end - start) * Math.min(Math.max(amount, 0), 1))
  return {
    red: mix(first.red, second.red),
    green: mix(first.green, second.green),
    blue: mix(first.blue, second.blue),
  }
}

export function paperApertureAmountAtHeat(heat: number): number {
  const burn = MAGNIFYING_GLASS_CONFIG.burn
  return smoothStep(burn.perforationStartsAt, burn.openHoleAt, heat)
}

interface PaperAperturePaintOptions {
  context: CanvasRenderingContext2D
  heat: Float32Array
  seed: number
  columns: number
  rows: number
  cellWidth: number
  cellHeight: number
  rasterScale: number
}

export function paintPaperAperture({
  context,
  heat,
  seed,
  columns,
  rows,
  cellWidth,
  cellHeight,
  rasterScale,
}: PaperAperturePaintOptions): void {
  const variedHeat = new Float32Array(heat.length)
  let maximumVariedHeat = 0
  for (let index = 0; index < heat.length; index += 1) {
    const value = heat[index]! * cellVariation(seed, index)
    variedHeat[index] = value
    maximumVariedHeat = Math.max(maximumVariedHeat, value)
  }
  if (
    maximumVariedHeat <=
    MAGNIFYING_GLASS_CONFIG.burn.perforationStartsAt
  ) return

  const width = context.canvas.width
  const height = context.canvas.height
  const image = context.createImageData(width, height)
  const aperture = MAGNIFYING_GLASS_CONFIG.burn.aperture
  const charColor = rgb(aperture.charRimColor)
  const edgeHighlight = rgb(aperture.paperEdgeHighlight)
  const edgeShadow = rgb(aperture.paperEdgeShadow)
  const backingColor = rgb(aperture.backingColor)
  const backingShadow = rgb(aperture.backingShadowColor)
  const lightLength = Math.hypot(
    aperture.lightDirection.x,
    aperture.lightDirection.y,
  )
  const lightX = aperture.lightDirection.x / lightLength
  const lightY = aperture.lightDirection.y / lightLength

  for (let rasterY = 0; rasterY < height; rasterY += 1) {
    const logicalY = rasterY / rasterScale
    const gridY = logicalY / cellHeight - 0.5
    const top = Math.min(Math.max(Math.floor(gridY), 0), rows - 1)
    const bottom = Math.min(top + 1, rows - 1)
    const amountY = Math.min(Math.max(gridY - Math.floor(gridY), 0), 1)

    for (let rasterX = 0; rasterX < width; rasterX += 1) {
      const logicalX = rasterX / rasterScale
      const gridX = logicalX / cellWidth - 0.5
      const left = Math.min(Math.max(Math.floor(gridX), 0), columns - 1)
      const right = Math.min(left + 1, columns - 1)
      const amountX = Math.min(
        Math.max(gridX - Math.floor(gridX), 0),
        1,
      )
      const topLeft = variedHeat[top * columns + left]!
      const topRight = variedHeat[top * columns + right]!
      const bottomLeft = variedHeat[bottom * columns + left]!
      const bottomRight = variedHeat[bottom * columns + right]!
      const topHeat = topLeft + (topRight - topLeft) * amountX
      const bottomHeat =
        bottomLeft + (bottomRight - bottomLeft) * amountX
      const interpolatedHeat =
        topHeat + (bottomHeat - topHeat) * amountY
      const hole = paperApertureAmountAtHeat(interpolatedHeat)
      if (hole <= 0) continue

      const gradientX =
        (topRight - topLeft) * (1 - amountY) +
        (bottomRight - bottomLeft) * amountY
      const gradientY =
        (bottomLeft - topLeft) * (1 - amountX) +
        (bottomRight - topRight) * amountX
      const gradientLength = Math.hypot(gradientX, gradientY)
      const facingLight =
        gradientLength > 0.0001
          ? Math.min(
              Math.max(
                (gradientX / gradientLength) * lightX +
                  (gradientY / gradientLength) * lightY,
                -1,
              ),
              1,
            ) *
              0.5 +
            0.5
          : 0.5
      const edgeColor = mixColor(edgeShadow, edgeHighlight, facingLight)

      let color = mixColor(
        charColor,
        edgeColor,
        smoothStep(0.18, 0.48, hole),
      )
      color = mixColor(
        color,
        backingShadow,
        smoothStep(0.46, 0.7, hole),
      )
      color = mixColor(
        color,
        backingColor,
        smoothStep(0.7, 0.96, hole),
      )

      const pixel = (rasterY * width + rasterX) * 4
      image.data[pixel] = color.red
      image.data[pixel + 1] = color.green
      image.data[pixel + 2] = color.blue
      image.data[pixel + 3] = Math.round(smoothStep(0, 0.1, hole) * 255)
    }
  }

  context.putImageData(image, 0, 0)
}
