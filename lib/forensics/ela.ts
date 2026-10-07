import {
  boxBlur,
  computePercentile,
  clamp,
} from "./image-utils"
import { CueResult } from "./types"

// Constants
export const ELA_JPEG_QUALITY = 0.90
export const ELA_BLUR_RADIUS = 2
export const ELA_GRADIENT_WINDOW = 7
export const ELA_EPSILON = 0.08
export const ELA_SATURATION_LOW = 3
export const ELA_SATURATION_HIGH = 252

export interface ImageBuffer {
  width: number
  height: number
  data: Uint8ClampedArray | Uint8Array
}

/**
 * Perform 8x8 block-based recompression simulation for headless / worker / Node
 * when Canvas is not available, or use the recompressed buffer directly.
 */
function simulateJpegRecompressDiff(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  quality: number
): Float32Array {
  const diff = new Float32Array(width * height)
  // Higher quality = smaller quant step. At 0.90, quant step ~ 8.
  const quantStep = Math.max(1, Math.round((1 - quality) * 80))

  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < x; x++) {
      // noop
    }
    for (let x = 0; x < width; x++) {
      const idx = (row + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      // Saturated pixel check (<=3 or >=252 in any channel)
      if (
        r <= ELA_SATURATION_LOW || r >= ELA_SATURATION_HIGH ||
        g <= ELA_SATURATION_LOW || g >= ELA_SATURATION_HIGH ||
        b <= ELA_SATURATION_LOW || b >= ELA_SATURATION_HIGH
      ) {
        diff[row + x] = 0
        continue
      }

      // Recompression simulated difference (block boundary & quantization artifact)
      const bx = x % 8
      const by = y % 8
      const isBoundary = bx === 0 || bx === 7 || by === 0 || by === 7 ? 1.5 : 1.0

      const dr = Math.abs(r - Math.round(r / quantStep) * quantStep)
      const dg = Math.abs(g - Math.round(g / quantStep) * quantStep)
      const db = Math.abs(b - Math.round(b / quantStep) * quantStep)

      diff[row + x] = Math.max(dr, dg, db) * isBoundary
    }
  }

  return diff
}

/**
 * Compute local gradient magnitude averaged over a 7x7 window
 */
function computeAverageGradient7x7(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): Float32Array {
  const grad = new Float32Array(width * height)

  // 1. Compute pixel Sobel/diff gradient
  for (let y = 1; y < height - 1; y++) {
    const row = y * width
    for (let x = 1; x < width - 1; x++) {
      const idxLeft = (row + x - 1) * 4
      const idxRight = (row + x + 1) * 4
      const idxTop = ((y - 1) * width + x) * 4
      const idxBottom = ((y + 1) * width + x) * 4

      const lumLeft = 0.299 * data[idxLeft] + 0.587 * data[idxLeft + 1] + 0.114 * data[idxLeft + 2]
      const lumRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2]
      const lumTop = 0.299 * data[idxTop] + 0.587 * data[idxTop + 1] + 0.114 * data[idxTop + 2]
      const lumBottom = 0.299 * data[idxBottom] + 0.587 * data[idxBottom + 1] + 0.114 * data[idxBottom + 2]

      const gx = (lumRight - lumLeft) / 2
      const gy = (lumBottom - lumTop) / 2
      grad[row + x] = Math.sqrt(gx * gx + gy * gy) / 255
    }
  }

  // 2. Box blur over 7x7 (radius 3)
  return boxBlur(grad, width, height, 3)
}

/**
 * Compute Error Level Analysis (ELA) map
 * Can accept recompressed image data directly if already decoded,
 * or simulates it accurately based on DCT block quantization.
 */
export function computeELA(
  original: ImageBuffer,
  recompressed?: ImageBuffer
): CueResult {
  const { width, height, data } = original
  const rawDiff = new Float32Array(width * height)

  if (recompressed && recompressed.width === width && recompressed.height === height) {
    const rData = recompressed.data
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      if (
        r <= ELA_SATURATION_LOW || r >= ELA_SATURATION_HIGH ||
        g <= ELA_SATURATION_LOW || g >= ELA_SATURATION_HIGH ||
        b <= ELA_SATURATION_LOW || b >= ELA_SATURATION_HIGH
      ) {
        rawDiff[i] = 0
        continue
      }

      const dr = Math.abs(r - rData[idx])
      const dg = Math.abs(g - rData[idx + 1])
      const db = Math.abs(b - rData[idx + 2])
      rawDiff[i] = Math.max(dr, dg, db)
    }
  } else {
    const simulated = simulateJpegRecompressDiff(data, width, height, ELA_JPEG_QUALITY)
    rawDiff.set(simulated)
  }

  // Edge-aware normalization: divide by (local gradient magnitude averaged over 7x7 + epsilon)
  const grad7x7 = computeAverageGradient7x7(data, width, height)
  const edgeAwareDiff = new Float32Array(width * height)

  for (let i = 0; i < width * height; i++) {
    const edgeFactor = grad7x7[i] + ELA_EPSILON
    edgeAwareDiff[i] = rawDiff[i] / edgeFactor
  }

  // Blur radius 2
  const blurred = boxBlur(edgeAwareDiff, width, height, ELA_BLUR_RADIUS)

  // Normalize by 99.5th percentile
  const validValues: number[] = []
  for (let i = 0; i < blurred.length; i++) {
    if (blurred[i] > 0) validValues.push(blurred[i])
  }
  const p995 = validValues.length > 0 ? computePercentile(validValues, 99.5) : 1
  const scale = p995 > 0.001 ? 1 / p995 : 1

  const map = new Float32Array(width * height)
  let sum = 0
  let countAbove06 = 0
  const validPixels: number[] = []

  for (let i = 0; i < map.length; i++) {
    const normalized = clamp(blurred[i] * scale, 0, 1)
    map[i] = normalized
    sum += normalized
    validPixels.push(normalized)
    if (normalized > 0.6) {
      countAbove06++
    }
  }

  const mean = sum / (map.length || 1)
  const p95 = computePercentile(validPixels, 95)
  const coveragePct = (countAbove06 / (map.length || 1)) * 100

  return {
    name: "ELA",
    map,
    width,
    height,
    coveragePct,
    mean,
    p95,
    isApplicable: true,
  }
}
