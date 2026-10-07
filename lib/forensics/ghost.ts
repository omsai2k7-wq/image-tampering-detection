import {
  bilinearUpsample,
  computePercentile,
  clamp,
} from "./image-utils"
import { CueResult } from "./types"
import { ImageBuffer } from "./ela"

// Constants
export const GHOST_BLOCK_SIZE = 16
export const GHOST_QUALITIES = [55, 60, 65, 70, 75, 80, 85, 90, 95]
export const GHOST_MAX_DIM = 1024

/**
 * Compute block difference across qualities 55..95
 */
function simulateQualityDiff(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  quality: number
): Float32Array {
  const diff = new Float32Array(width * height)
  const qFactor = Math.max(1, Math.round((100 - quality) * 0.8))

  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      const idx = (row + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const qr = Math.round(r / qFactor) * qFactor
      const qg = Math.round(g / qFactor) * qFactor
      const qb = Math.round(b / qFactor) * qFactor

      const dr = r - qr
      const dg = g - qg
      const db = b - qb

      // Squared difference averaged over channels
      diff[row + x] = (dr * dr + dg * dg + db * db) / 3
    }
  }

  return diff
}

/**
 * Compute JPEG Ghost cue
 * - Skip for PNG input and mark isApplicable: false
 * - Recompress / simulate qualities 55..95 step 5
 * - Box average squared difference over 16x16 blocks
 * - Find min quality (ghost quality) and clarity per block
 * - Dominant ghost quality = mode of argmin histogram
 * - Map = normalized deviation from dominant, weighted by minimum clarity
 */
export function computeJpegGhost(
  image: ImageBuffer,
  format: "jpeg" | "png" | "webp" | "unknown"
): CueResult {
  const { width, height, data } = image

  // If PNG input, skip and return Not applicable
  if (format === "png") {
    return {
      name: "JPEG ghost",
      map: new Float32Array(width * height),
      width,
      height,
      coveragePct: 0,
      mean: 0,
      p95: 0,
      isApplicable: false,
      note: "Not applicable (PNG input has no JPEG compression history)",
    }
  }

  const blocksX = Math.max(1, Math.floor(width / GHOST_BLOCK_SIZE))
  const blocksY = Math.max(1, Math.floor(height / GHOST_BLOCK_SIZE))
  const numBlocks = blocksX * blocksY

  // Block error matrix [numQualities][numBlocks]
  const blockErrors: Float32Array[] = []

  for (const q of GHOST_QUALITIES) {
    const diffMap = simulateQualityDiff(data, width, height, q)
    const errors = new Float32Array(numBlocks)

    for (let by = 0; by < blocksY; by++) {
      const startY = by * GHOST_BLOCK_SIZE
      const endY = Math.min(height, startY + GHOST_BLOCK_SIZE)

      for (let bx = 0; bx < blocksX; bx++) {
        const startX = bx * GHOST_BLOCK_SIZE
        const endX = Math.min(width, startX + GHOST_BLOCK_SIZE)

        let sum = 0
        let count = 0

        for (let y = startY; y < endY; y++) {
          const row = y * width
          for (let x = startX; x < endX; x++) {
            sum += diffMap[row + x]
            count++
          }
        }

        errors[by * blocksX + bx] = count > 0 ? sum / count : 0
      }
    }

    blockErrors.push(errors)
  }

  // Find argmin quality & clarity for each block
  const bestQualities = new Int32Array(numBlocks)
  const clarities = new Float32Array(numBlocks)
  const histogram: Record<number, number> = {}

  for (let b = 0; b < numBlocks; b++) {
    let minErr = Infinity
    let secondMinErr = Infinity
    let bestQIdx = 0

    for (let qIdx = 0; qIdx < GHOST_QUALITIES.length; qIdx++) {
      const err = blockErrors[qIdx][b]
      if (err < minErr) {
        secondMinErr = minErr
        minErr = err
        bestQIdx = qIdx
      } else if (err < secondMinErr) {
        secondMinErr = err
      }
    }

    const bestQ = GHOST_QUALITIES[bestQIdx]
    bestQualities[b] = bestQ
    histogram[bestQ] = (histogram[bestQ] || 0) + 1

    // Clarity: relative difference between 2nd min and min
    const diff = secondMinErr - minErr
    const denom = minErr + 1e-4
    clarities[b] = clamp(diff / denom, 0, 1)
  }

  // Find dominant quality (mode of histogram)
  let dominantQ = GHOST_QUALITIES[0]
  let maxCount = -1

  for (const q of GHOST_QUALITIES) {
    const count = histogram[q] || 0
    if (count > maxCount) {
      maxCount = count
      dominantQ = q
    }
  }

  // Compute deviation from dominant quality, weighted by clarity
  const blockDeviation = new Float32Array(numBlocks)
  const maxPossibleDev = 40 // difference between 55 and 95

  for (let b = 0; b < numBlocks; b++) {
    const dev = Math.abs(bestQualities[b] - dominantQ) / maxPossibleDev
    blockDeviation[b] = clamp(dev * (0.4 + 0.6 * clarities[b]), 0, 1)
  }

  // Bilinear upsample back to image dimensions
  const map = bilinearUpsample(blockDeviation, blocksX, blocksY, width, height)

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
    name: "JPEG ghost",
    map,
    width,
    height,
    coveragePct,
    mean,
    p95,
    isApplicable: true,
  }
}
