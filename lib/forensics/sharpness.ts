import {
  rgbToLuminance,
  computeMedian,
  computeMAD,
  robustZScore,
  bilinearUpsample,
  computePercentile,
  clamp,
} from "./image-utils"
import { CueResult } from "./types"
import { ImageBuffer } from "./ela"

// Constants
export const SHARPNESS_BLOCK_SIZE = 32
export const SHARPNESS_Z_MIN = 0
export const SHARPNESS_Z_MAX = 4

/**
 * 3x3 Discrete Laplacian kernel filter:
 *  [ 0  1  0 ]
 *  [ 1 -4  1 ]
 *  [ 0  1  0 ]
 */
function computeLaplacian(lum: Float32Array, width: number, height: number): Float32Array {
  const lap = new Float32Array(width * height)

  for (let y = 1; y < height - 1; y++) {
    const row = y * width
    for (let x = 1; x < width - 1; x++) {
      const c = lum[row + x]
      const top = lum[(y - 1) * width + x]
      const bottom = lum[(y + 1) * width + x]
      const left = lum[row + x - 1]
      const right = lum[row + x + 1]

      lap[row + x] = top + bottom + left + right - 4 * c
    }
  }

  return lap
}

/**
 * Compute Sharpness cue map
 * - Laplacian variance per 32x32 block
 * - log(1 + v) transform
 * - Robust z-score (median/MAD)
 * - Clipped 0..1
 * - Bilinear upsample
 */
export function computeSharpness(image: ImageBuffer): CueResult {
  const { width, height, data } = image

  // 1. Luminance
  const lum = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    lum[i] = rgbToLuminance(data[idx], data[idx + 1], data[idx + 2])
  }

  // 2. Laplacian
  const lap = computeLaplacian(lum, width, height)

  // 3. Variance per 32x32 block
  const blocksX = Math.max(1, Math.floor(width / SHARPNESS_BLOCK_SIZE))
  const blocksY = Math.max(1, Math.floor(height / SHARPNESS_BLOCK_SIZE))
  const blockLogVars = new Float32Array(blocksX * blocksY)

  for (let by = 0; by < blocksY; by++) {
    const startY = by * SHARPNESS_BLOCK_SIZE
    const endY = Math.min(height, startY + SHARPNESS_BLOCK_SIZE)

    for (let bx = 0; bx < blocksX; bx++) {
      const startX = bx * SHARPNESS_BLOCK_SIZE
      const endX = Math.min(width, startX + SHARPNESS_BLOCK_SIZE)

      let sum = 0
      let sumSq = 0
      let count = 0

      for (let y = startY; y < endY; y++) {
        const row = y * width
        for (let x = startX; x < endX; x++) {
          const val = lap[row + x]
          sum += val
          sumSq += val * val
          count++
        }
      }

      const mean = count > 0 ? sum / count : 0
      const variance = count > 1 ? (sumSq - count * mean * mean) / (count - 1) : 0
      // log(1 + v)
      blockLogVars[by * blocksX + bx] = Math.log1p(Math.max(0, variance))
    }
  }

  // 4. Robust z-score
  const med = computeMedian(blockLogVars)
  const mad = computeMAD(blockLogVars, med)

  const blockZ = new Float32Array(blocksX * blocksY)
  for (let i = 0; i < blockLogVars.length; i++) {
    const z = robustZScore(blockLogVars[i], med, mad)
    blockZ[i] = clamp((z - SHARPNESS_Z_MIN) / (SHARPNESS_Z_MAX - SHARPNESS_Z_MIN), 0, 1)
  }

  // 5. Bilinear upsample
  const map = bilinearUpsample(blockZ, blocksX, blocksY, width, height)

  let sumMap = 0
  let countAbove06 = 0
  const validPixels: number[] = []

  for (let i = 0; i < map.length; i++) {
    const v = map[i]
    sumMap += v
    validPixels.push(v)
    if (v > 0.6) {
      countAbove06++
    }
  }

  const mean = sumMap / (map.length || 1)
  const p95 = computePercentile(validPixels, 95)
  const coveragePct = (countAbove06 / (map.length || 1)) * 100

  return {
    name: "Sharpness",
    map,
    width,
    height,
    coveragePct,
    mean,
    p95,
    isApplicable: true,
  }
}
