/**
 * Core image processing & robust mathematical utilities for forensics.
 * Pure TypeScript functions executable in browser, web worker, and node/vitest.
 */

export function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v))
}

export function rgbToLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

export function rgbToYCbCr(r: number, g: number, b: number): [number, number, number] {
  const y = 0.299 * r + 0.587 * g + 0.114 * b
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
  return [y, cb, cr]
}

export function computePercentile(arr: Float32Array | number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = Array.from(arr).filter((v) => !Number.isNaN(v))
  if (sorted.length === 0) return 0
  sorted.sort((a, b) => a - b)
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower])
}

export function computeMedian(arr: Float32Array | number[]): number {
  return computePercentile(arr, 50)
}

export function computeMAD(arr: Float32Array | number[], med?: number): number {
  const m = med !== undefined ? med : computeMedian(arr)
  const diffs = new Float32Array(arr.length)
  for (let i = 0; i < arr.length; i++) {
    diffs[i] = Math.abs(arr[i] - m)
  }
  return computeMedian(diffs)
}

/**
 * Robust z-score using Median and Median Absolute Deviation (MAD).
 * Multiplier 1.4826 standardizes MAD for normal distributions.
 */
export function robustZScore(val: number, median: number, mad: number, eps = 1e-6): number {
  const scale = 1.4826 * mad + eps
  return Math.abs(val - median) / scale
}

/**
 * 2D separable Gaussian blur on Float32Array
 */
export function gaussianBlur(
  src: Float32Array,
  width: number,
  height: number,
  sigma: number
): Float32Array {
  if (sigma <= 0.1) return new Float32Array(src)

  const radius = Math.ceil(sigma * 2.5)
  const kernelSize = 2 * radius + 1
  const kernel = new Float32Array(kernelSize)
  let sum = 0

  for (let i = -radius; i <= radius; i++) {
    const val = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel[i + radius] = val
    sum += val
  }
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum
  }

  const temp = new Float32Array(width * height)
  const dst = new Float32Array(width * height)

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    for (let x = 0; x < width; x++) {
      let acc = 0
      for (let k = -radius; k <= radius; k++) {
        const px = Math.min(width - 1, Math.max(0, x + k))
        acc += src[rowOffset + px] * kernel[k + radius]
      }
      temp[rowOffset + x] = acc
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0
      for (let k = -radius; k <= radius; k++) {
        const py = Math.min(height - 1, Math.max(0, y + k))
        acc += temp[py * width + x] * kernel[k + radius]
      }
      dst[y * width + x] = acc
    }
  }

  return dst
}

/**
 * Fast 2D box blur
 */
export function boxBlur(
  src: Float32Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  if (radius <= 0) return new Float32Array(src)
  const dst = new Float32Array(width * height)
  const temp = new Float32Array(width * height)

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    let sum = 0
    let count = 0
    for (let k = -radius; k <= radius; k++) {
      const px = Math.min(width - 1, Math.max(0, k))
      sum += src[rowOffset + px]
      count++
    }
    for (let x = 0; x < width; x++) {
      dst[rowOffset + x] = sum / count
      const left = Math.max(0, x - radius)
      const right = Math.min(width - 1, x + radius + 1)
      sum += src[rowOffset + right] - src[rowOffset + left]
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    let sum = 0
    let count = 0
    for (let k = -radius; k <= radius; k++) {
      const py = Math.min(height - 1, Math.max(0, k))
      sum += dst[py * width + x]
      count++
    }
    for (let y = 0; y < height; y++) {
      temp[y * width + x] = sum / count
      const top = Math.max(0, y - radius)
      const bottom = Math.min(height - 1, y + radius + 1)
      sum += dst[bottom * width + x] - dst[top * width + x]
    }
  }

  return temp
}

/**
 * Bilinear upsample from (sw, sh) to (dw, dh)
 */
export function bilinearUpsample(
  src: Float32Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number
): Float32Array {
  const dst = new Float32Array(dw * dh)
  const xRatio = sw > 1 ? (sw - 1) / (dw - 1 || 1) : 0
  const yRatio = sh > 1 ? (sh - 1) / (dh - 1 || 1) : 0

  for (let y = 0; y < dh; y++) {
    const srcY = y * yRatio
    const y0 = Math.floor(srcY)
    const y1 = Math.min(sh - 1, y0 + 1)
    const dy = srcY - y0

    const rowOffset = y * dw
    const srcRow0 = y0 * sw
    const srcRow1 = y1 * sw

    for (let x = 0; x < dw; x++) {
      const srcX = x * xRatio
      const x0 = Math.floor(srcX)
      const x1 = Math.min(sw - 1, x0 + 1)
      const dx = srcX - x0

      const v00 = src[srcRow0 + x0]
      const v10 = src[srcRow0 + x1]
      const v01 = src[srcRow1 + x0]
      const v11 = src[srcRow1 + x1]

      const top = v00 * (1 - dx) + v10 * dx
      const bottom = v01 * (1 - dx) + v11 * dx
      dst[rowOffset + x] = top * (1 - dy) + bottom * dy
    }
  }

  return dst
}

/**
 * 3x3 Median filter on 1D Float32Array luminance
 */
export function medianFilter3x3(src: Float32Array, width: number, height: number): Float32Array {
  const dst = new Float32Array(width * height)
  const window = new Float32Array(9)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let idx = 0
      for (let dy = -1; dy <= 1; dy++) {
        const py = Math.min(height - 1, Math.max(0, y + dy))
        const row = py * width
        for (let dx = -1; dx <= 1; dx++) {
          const px = Math.min(width - 1, Math.max(0, x + dx))
          window[idx++] = src[row + px]
        }
      }
      // Simple 9-element insertion sort
      for (let i = 1; i < 9; i++) {
        const val = window[i]
        let j = i - 1
        while (j >= 0 && window[j] > val) {
          window[j + 1] = window[j]
          j--
        }
        window[j + 1] = val
      }
      dst[y * width + x] = window[4] // median element
    }
  }

  return dst
}
