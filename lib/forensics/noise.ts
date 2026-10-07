import {
  rgbToLuminance,
  medianFilter3x3,
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
export const NOISE_BLOCK_SIZE = 16
export const NOISE_Z_MIN = 0
export const NOISE_Z_MAX = 4

/**
 * Compute Noise Residual cue map
 * - Luminance minus 3x3 median copy
 * - Variance per 16x16 block
 * - Robust z-score (median/MAD over valid blocks)
 * - |z| clipped 0..4 to 0..1
 * - Bilinear upsample back to original dimensions
 */
export function computeNoiseResidual(image: ImageBuffer): CueResult {
  const { width, height, data } = image

  // 1. Compute luminance
  const lum = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    lum[i] = rgbToLuminance(data[idx], data[idx + 1], data[idx + 2])
  }

  // 2. 3x3 median filter copy & compute residual
  const medianCopy = medianFilter3x3(lum, width, height)
  const residual = new Float32Array(width * height)
  for (let i = 0; i < residual.length; i++) {
    residual[i] = lum[i] - medianCopy[i]
  }

  // 3. Variance per 16x16 block
  const blocksX = Math.max(1, Math.floor(width / NOISE_BLOCK_SIZE))
  const blocksY = Math.max(1, Math.floor(height / NOISE_BLOCK_SIZE))
  const blockVariances = new Float32Array(blocksX * blocksY)

  for (let by = 0; by < blocksY; by++) {
    const startY = by * NOISE_BLOCK_SIZE
    const endY = Math.min(height, startY + NOISE_BLOCK_SIZE)

    for (let bx = 0; bx < blocksX; bx++) {
      const startX = bx * NOISE_BLOCK_SIZE
      const endX = Math.min(width, startX + NOISE_BLOCK_SIZE)

      let sum = 0
      let sumSq = 0
      let count = 0

      for (let y = startY; y < endY; y++) {
        const row = y * width
        for (let x = startX; x < endX; x++) {
          const val = residual[row + x]
          sum += val
          sumSq += val * val
          count++
        }
      }

      const mean = count > 0 ? sum / count : 0
      const variance = count > 1 ? (sumSq - count * mean * mean) / (count - 1) : 0
      blockVariances[by * blocksX + bx] = Math.max(0, variance)
    }
  }

  // 4. Robust z-score (median/MAD over valid blocks)
  const med = computeMedian(blockVariances)
  const mad = computeMAD(blockVariances, med)

  const blockZ = new Float32Array(blocksX * blocksY)
  for (let i = 0; i < blockVariances.length; i++) {
    const z = robustZScore(blockVariances[i], med, mad)
    // Clip 0..4 mapped to 0..1
    blockZ[i] = clamp((z - NOISE_Z_MIN) / (NOISE_Z_MAX - NOISE_Z_MIN), 0, 1)
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
    name: "Noise",
    map,
    width,
    height,
    coveragePct,
    mean,
    p95,
    isApplicable: true,
  }
}
