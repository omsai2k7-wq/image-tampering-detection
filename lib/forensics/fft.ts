import { rgbToLuminance, computePercentile, clamp } from "./image-utils"
import { CueResult } from "./types"
import { ImageBuffer } from "./ela"

/**
 * 1D Cooley-Tukey Radix-2 FFT (in-place on real & imag arrays)
 */
function fft1D(real: Float32Array, imag: Float32Array, n: number) {
  // Bit-reversal permutation
  let j = 0
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tr = real[i]
      real[i] = real[j]
      real[j] = tr
      const ti = imag[i]
      imag[i] = imag[j]
      imag[j] = ti
    }
    let k = n >> 1
    while (k <= j) {
      j -= k
      k >>= 1
    }
    j += k
  }

  // Butterfly computations
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1
    const angle = (-2 * Math.PI) / len
    const wstepR = Math.cos(angle)
    const wstepI = Math.sin(angle)

    for (let i = 0; i < n; i += len) {
      let wr = 1
      let wi = 0
      for (let k = 0; k < half; k++) {
        const idx1 = i + k
        const idx2 = i + k + half
        const tr = wr * real[idx2] - wi * imag[idx2]
        const ti = wr * imag[idx2] + wi * real[idx2]

        real[idx2] = real[idx1] - tr
        imag[idx2] = imag[idx1] - ti
        real[idx1] += tr
        imag[idx1] += ti

        const nextWr = wr * wstepR - wi * wstepI
        wi = wr * wstepI + wi * wstepR
        wr = nextWr
      }
    }
  }
}

/**
 * Nearest power of 2 <= n (capped at 512 for fast educational display)
 */
function powerOfTwoSize(dim: number, max = 256): number {
  let size = 16
  while (size * 2 <= dim && size * 2 <= max) {
    size *= 2
  }
  return size
}

/**
 * 2D Fast Fourier Transform magnitude spectrum (centered, log scaled)
 * Used as an educational card, NOT part of the fusion.
 */
export function computeFFT(image: ImageBuffer): CueResult {
  const { width, height, data } = image
  const size = powerOfTwoSize(Math.min(width, height), 256)

  // Downsample/crop central square to size x size
  const real = new Float32Array(size * size)
  const imag = new Float32Array(size * size)

  const startX = Math.floor((width - size) / 2)
  const startY = Math.floor((height - size) / 2)

  // Apply 2D Hann window to reduce edge spectral leakage
  for (let y = 0; y < size; y++) {
    const wy = 0.5 * (1 - Math.cos((2 * Math.PI * y) / (size - 1)))
    const imgY = Math.min(height - 1, Math.max(0, startY + y))
    const row = imgY * width

    for (let x = 0; x < size; x++) {
      const wx = 0.5 * (1 - Math.cos((2 * Math.PI * x) / (size - 1)))
      const imgX = Math.min(width - 1, Math.max(0, startX + x))
      const idx = (row + imgX) * 4
      const lum = rgbToLuminance(data[idx], data[idx + 1], data[idx + 2])
      real[y * size + x] = (lum - 128) * wx * wy
    }
  }

  // 1. FFT along rows
  const rowR = new Float32Array(size)
  const rowI = new Float32Array(size)

  for (let y = 0; y < size; y++) {
    const offset = y * size
    for (let x = 0; x < size; x++) {
      rowR[x] = real[offset + x]
      rowI[x] = 0
    }
    fft1D(rowR, rowI, size)
    for (let x = 0; x < size; x++) {
      real[offset + x] = rowR[x]
      imag[offset + x] = rowI[x]
    }
  }

  // 2. FFT along columns
  const colR = new Float32Array(size)
  const colI = new Float32Array(size)

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      colR[y] = real[y * size + x]
      colI[y] = imag[y * size + x]
    }
    fft1D(colR, colI, size)
    for (let y = 0; y < size; y++) {
      real[y * size + x] = colR[y]
      imag[y * size + x] = colI[y]
    }
  }

  // 3. Shift zero frequency to center and compute log magnitude
  const shiftedMag = new Float32Array(size * size)
  const half = size / 2
  let maxLogMag = 0

  for (let y = 0; y < size; y++) {
    const sy = (y + half) % size
    for (let x = 0; x < size; x++) {
      const sx = (x + half) % size
      const r = real[sy * size + sx]
      const im = imag[sy * size + sx]
      const mag = Math.sqrt(r * r + im * im)
      const logMag = Math.log1p(mag)
      shiftedMag[y * size + x] = logMag
      if (logMag > maxLogMag) maxLogMag = logMag
    }
  }

  // Normalize 0..1
  const map = new Float32Array(size * size)
  const scale = maxLogMag > 0 ? 1 / maxLogMag : 1
  let sum = 0
  const validPixels: number[] = []

  for (let i = 0; i < shiftedMag.length; i++) {
    const val = clamp(shiftedMag[i] * scale, 0, 1)
    map[i] = val
    sum += val
    validPixels.push(val)
  }

  const mean = sum / (map.length || 1)
  const p95 = computePercentile(validPixels, 95)

  return {
    name: "Frequency",
    map,
    width: size,
    height: size,
    coveragePct: (validPixels.filter((v) => v > 0.6).length / (map.length || 1)) * 100,
    mean,
    p95,
    isApplicable: true,
    note: "Educational 2D Fourier power spectrum showing periodic high-frequency patterns",
  }
}
