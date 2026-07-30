import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const FRAME_SIZE = 128
const COLUMNS = 10
const ROWS = 10
const WIDTH = FRAME_SIZE * COLUMNS
const HEIGHT = FRAME_SIZE * ROWS
const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/assets/expressive-pigment-atlas.png",
)

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return amount * amount * (3 - 2 * amount)
}

function makeNoise(seed, scale) {
  const random = mulberry32(seed)
  const gridWidth = Math.ceil(FRAME_SIZE / scale) + 2
  const grid = Array.from({ length: gridWidth * gridWidth }, () => random())

  return (x, y) => {
    const gridX = x / scale
    const gridY = y / scale
    const x0 = Math.floor(gridX)
    const y0 = Math.floor(gridY)
    const tx = smoothstep(0, 1, gridX - x0)
    const ty = smoothstep(0, 1, gridY - y0)
    const at = (sampleX, sampleY) => grid[sampleY * gridWidth + sampleX]
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx
    const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx
    return top * (1 - ty) + bottom * ty
  }
}

function expressiveDensity(seed) {
  const random = mulberry32(seed)
  const fine = makeNoise(seed + 11, 3)
  const medium = makeNoise(seed + 29, 12)
  const broad = makeNoise(seed + 47, 34)
  const blooms = Array.from({ length: 10 }, () => ({
    x: random() * FRAME_SIZE,
    y: random() * FRAME_SIZE,
    radius: 7 + random() * 20,
    weight: random() * 2 - 1,
  }))

  return (x, y) => {
    const normalizedX = x / (FRAME_SIZE - 1)
    const normalizedY = y / (FRAME_SIZE - 1)
    const grain = fine(x, y) - 0.5
    const cloud = medium(x, y) - 0.5
    const wash = broad(x, y) - 0.5
    const nearestEdge = Math.min(
      normalizedX,
      normalizedY,
      1 - normalizedX,
      1 - normalizedY,
    )
    const edgePooling = 1 - smoothstep(0.015, 0.18, nearestEdge)
    let clusteredBloom = 0

    for (const bloom of blooms) {
      const distance = Math.hypot(x - bloom.x, y - bloom.y)
      clusteredBloom +=
        bloom.weight *
        Math.exp(-(distance * distance) / (2 * bloom.radius * bloom.radius))
    }

    return (
      0.96 +
      cloud * 0.15 +
      wash * 0.09 +
      grain * 0.07 +
      edgePooling * 0.07 +
      clusteredBloom * 0.045
    )
  }
}

function createAtlasPixels() {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4)

  for (let frame = 0; frame < COLUMNS * ROWS; frame += 1) {
    const densityAt = expressiveDensity(4109 + frame * 997)
    const frameX = (frame % COLUMNS) * FRAME_SIZE
    const frameY = Math.floor(frame / COLUMNS) * FRAME_SIZE

    for (let y = 0; y < FRAME_SIZE; y += 1) {
      for (let x = 0; x < FRAME_SIZE; x += 1) {
        const density = densityAt(x, y)
        const isDiluted = density < 1
        const coverage = isDiluted
          ? clamp(1 - (1 - density) * 1.55, 0.58, 1)
          : 1
        const pigment = isDiluted
          ? 255
          : Math.round(255 * clamp(1 - (density - 1) * 0.75, 0.84, 1))
        const atlasX = frameX + x
        const atlasY = frameY + y
        const offset = (atlasY * WIDTH + atlasX) * 4

        pixels[offset] = pigment
        pixels[offset + 1] = pigment
        pixels[offset + 2] = pigment
        pixels[offset + 3] = Math.round(coverage * 255)
      }
    }
  }

  return pixels
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function crc32(buffer) {
  let value = 0xffffffff
  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8)
  }
  return (value ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, checksum])
}

function encodePng(pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const header = Buffer.alloc(13)
  header.writeUInt32BE(WIDTH, 0)
  header.writeUInt32BE(HEIGHT, 4)
  header[8] = 8
  header[9] = 6

  const stride = WIDTH * 4
  const scanlines = Buffer.alloc((stride + 1) * HEIGHT)
  for (let y = 0; y < HEIGHT; y += 1) {
    const destination = y * (stride + 1)
    scanlines[destination] = 0
    pixels.copy(scanlines, destination + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, encodePng(createAtlasPixels()))
console.log(`Generated 100 expressive pigment tiles at ${OUTPUT_PATH}`)
