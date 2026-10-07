import { ImageBuffer } from "./ela"

/**
 * Generate a clean base image with smooth gradient and uniform sensor noise
 */
export function generateCleanImage(
  width = 256,
  height = 256,
  noiseAmp = 4
): ImageBuffer {
  const data = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y++) {
    const row = y * width * 4
    for (let x = 0; x < width; x++) {
      const idx = row + x * 4

      // Smooth diagonal gradient
      const baseR = 100 + (x / width) * 80
      const baseG = 110 + (y / height) * 70
      const baseB = 120 + ((x + y) / (width + height)) * 60

      // Uniform zero-mean sensor noise
      const n = (Math.random() - 0.5) * noiseAmp

      data[idx] = Math.max(10, Math.min(240, Math.round(baseR + n)))
      data[idx + 1] = Math.max(10, Math.min(240, Math.round(baseG + n)))
      data[idx + 2] = Math.max(10, Math.min(240, Math.round(baseB + n)))
      data[idx + 3] = 255
    }
  }

  return { width, height, data }
}

export interface SyntheticTamperResult {
  image: ImageBuffer
  gtMask: Uint8Array // 1 where tampered, 0 elsewhere
  tamperBbox: [number, number, number, number] // [x, y, w, h] normalized
  type: "splice" | "blur" | "resize"
}

/**
 * Generate synthetic splice tamper: patch with elevated noise & JPEG quantization discrepancy
 */
export function generateSpliceTamper(
  width = 256,
  height = 256,
  patchX = 60,
  patchY = 60,
  patchW = 70,
  patchH = 70
): SyntheticTamperResult {
  const base = generateCleanImage(width, height, 3)
  const gtMask = new Uint8Array(width * height)

  for (let y = patchY; y < patchY + patchH; y++) {
    const row = y * width
    for (let x = patchX; x < patchX + patchW; x++) {
      const idx = (row + x) * 4
      gtMask[row + x] = 1

      // Different noise profile + JPEG quantization steps (step 16)
      const patchNoise = (Math.random() - 0.5) * 35
      const r = base.data[idx] + patchNoise
      const g = base.data[idx + 1] + patchNoise
      const b = base.data[idx + 2] + patchNoise

      // Coarse quantization simulation
      base.data[idx] = Math.max(10, Math.min(240, Math.round(r / 16) * 16))
      base.data[idx + 1] = Math.max(10, Math.min(240, Math.round(g / 16) * 16))
      base.data[idx + 2] = Math.max(10, Math.min(240, Math.round(b / 16) * 16))
    }
  }

  return {
    image: base,
    gtMask,
    tamperBbox: [patchX / width, patchY / height, patchW / width, patchH / height],
    type: "splice",
  }
}

/**
 * Generate synthetic blur tamper: locally smoothed patch
 */
export function generateBlurTamper(
  width = 256,
  height = 256,
  patchX = 80,
  patchY = 80,
  patchW = 60,
  patchH = 60
): SyntheticTamperResult {
  const base = generateCleanImage(width, height, 12)
  const gtMask = new Uint8Array(width * height)

  // Local 5x5 box blur inside patch
  const copy = new Uint8ClampedArray(base.data)
  for (let y = patchY; y < patchY + patchH; y++) {
    for (let x = patchX; x < patchX + patchW; x++) {
      gtMask[y * width + x] = 1

      let rSum = 0, gSum = 0, bSum = 0, count = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ny = Math.min(height - 1, Math.max(0, y + dy))
          const nx = Math.min(width - 1, Math.max(0, x + dx))
          const idx = (ny * width + nx) * 4
          rSum += copy[idx]
          gSum += copy[idx + 1]
          bSum += copy[idx + 2]
          count++
        }
      }

      const dstIdx = (y * width + x) * 4
      base.data[dstIdx] = Math.round(rSum / count)
      base.data[dstIdx + 1] = Math.round(gSum / count)
      base.data[dstIdx + 2] = Math.round(bSum / count)
    }
  }

  return {
    image: base,
    gtMask,
    tamperBbox: [patchX / width, patchY / height, patchW / width, patchH / height],
    type: "blur",
  }
}

/**
 * Generate synthetic resize/resample tamper: downsampled and upsampled patch
 */
export function generateResizeTamper(
  width = 256,
  height = 256,
  patchX = 70,
  patchY = 70,
  patchW = 65,
  patchH = 65
): SyntheticTamperResult {
  const base = generateCleanImage(width, height, 10)
  const gtMask = new Uint8Array(width * height)

  // Bilinear resample down by 3x and up
  for (let y = patchY; y < patchY + patchH; y++) {
    for (let x = patchX; x < patchX + patchW; x++) {
      gtMask[y * width + x] = 1

      const step = 4
      const nearestX = patchX + Math.floor((x - patchX) / step) * step
      const nearestY = patchY + Math.floor((y - patchY) / step) * step
      const nIdx = (nearestY * width + nearestX) * 4

      const idx = (y * width + x) * 4
      base.data[idx] = base.data[nIdx]
      base.data[idx + 1] = base.data[nIdx + 1]
      base.data[idx + 2] = base.data[nIdx + 2]
    }
  }

  return {
    image: base,
    gtMask,
    tamperBbox: [patchX / width, patchY / height, patchW / width, patchH / height],
    type: "resize",
  }
}

/**
 * Calculate Intersection over Union (IoU) between bounding box and ground truth mask
 */
export function calculateBboxMaskIoU(
  bbox: [number, number, number, number],
  gtMask: Uint8Array,
  width: number,
  height: number
): number {
  const [bx, by, bw, bh] = bbox
  const minX = Math.round(bx * width)
  const minY = Math.round(by * height)
  const maxX = Math.round((bx + bw) * width)
  const maxY = Math.round((by + bh) * height)

  let intersection = 0
  let union = 0

  for (let y = 0; y < height; y++) {
    const row = y * width
    const inBoxY = y >= minY && y < maxY
    for (let x = 0; x < width; x++) {
      const inBoxX = x >= minX && x < maxX
      const inBox = inBoxX && inBoxY
      const isGt = gtMask[row + x] === 1

      if (inBox && isGt) intersection++
      if (inBox || isGt) union++
    }
  }

  return union > 0 ? intersection / union : 0
}

/**
 * Calculate pixel-level metrics: IoU, Precision, Recall
 */
export function calculatePixelMetrics(
  predMask: Uint8Array,
  gtMask: Uint8Array
): { iou: number; precision: number; recall: number } {
  let tp = 0, fp = 0, fn = 0

  for (let i = 0; i < predMask.length; i++) {
    const p = predMask[i] === 1
    const g = gtMask[i] === 1

    if (p && g) tp++
    else if (p && !g) fp++
    else if (!p && g) fn++
  }

  const union = tp + fp + fn
  const iou = union > 0 ? tp / union : 1.0
  const precision = tp + fp > 0 ? tp / (tp + fp) : 1.0
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1.0

  return { iou, precision, recall }
}
