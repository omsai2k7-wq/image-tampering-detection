import { ForensicsReport, CueResult } from "./types"
import { computeELA, ImageBuffer } from "./ela"
import { computeNoiseResidual } from "./noise"
import { computeSharpness } from "./sharpness"
import { computeJpegGhost, GHOST_MAX_DIM } from "./ghost"
import { computeFFT } from "./fft"
import { analyzeFaceForensics } from "./faceforensics"
import { fuseCueMaps } from "./fusion"

export const MAX_ANALYSIS_DIM = 2048

/**
 * Scale image buffer to fit within maxDim preserving aspect ratio
 */
export function scaleImageBuffer(
  buffer: ImageBuffer,
  maxDim: number
): ImageBuffer {
  const { width, height, data } = buffer
  if (Math.max(width, height) <= maxDim) return buffer

  const scale = maxDim / Math.max(width, height)
  const targetW = Math.max(1, Math.round(width * scale))
  const targetH = Math.max(1, Math.round(height * scale))
  const targetData = new Uint8ClampedArray(targetW * targetH * 4)

  const xRatio = (width - 1) / (targetW - 1 || 1)
  const yRatio = (height - 1) / (targetH - 1 || 1)

  for (let y = 0; y < targetH; y++) {
    const srcY = Math.min(height - 1, Math.floor(y * yRatio))
    const rowOffset = y * targetW * 4
    const srcRow = srcY * width * 4

    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(width - 1, Math.floor(x * xRatio))
      const dstIdx = rowOffset + x * 4
      const srcIdx = srcRow + srcX * 4

      targetData[dstIdx] = data[srcIdx]
      targetData[dstIdx + 1] = data[srcIdx + 1]
      targetData[dstIdx + 2] = data[srcIdx + 2]
      targetData[dstIdx + 3] = data[srcIdx + 3]
    }
  }

  return {
    width: targetW,
    height: targetH,
    data: targetData,
  }
}

/**
 * Run the comprehensive multi-cue forensics analysis pipeline
 */
export async function runForensicsPipeline(
  imageBuffer: ImageBuffer,
  fileFormat: "jpeg" | "png" | "webp" | "unknown" = "jpeg",
  options?: {
    mlResult?: {
      score: number
      mapPngBase64?: string
      model: string
      version?: string
      elapsedMs?: number
    }
    customHighThresh?: number
    customLowThresh?: number
  }
): Promise<ForensicsReport> {
  const id = `trace-rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const analyzedAt = new Date().toISOString()

  // 1. Cap longest side at 2048
  const scaled = scaleImageBuffer(imageBuffer, MAX_ANALYSIS_DIM)
  const { width, height } = scaled

  // 2. Compute Classical Cue Maps
  // ELA
  const elaCue = computeELA(scaled)

  // Noise
  const noiseCue = computeNoiseResidual(scaled)

  // Sharpness
  const sharpnessCue = computeSharpness(scaled)

  // JPEG Ghost (capped at 1024, skipped for PNG)
  const ghostBuffer = scaleImageBuffer(scaled, GHOST_MAX_DIM)
  const rawGhostCue = computeJpegGhost(ghostBuffer, fileFormat)
  // If downscaled, ghost map is at ghostBuffer dimensions, resize back if needed
  let ghostCue = rawGhostCue
  if (rawGhostCue.isApplicable && (ghostBuffer.width !== width || ghostBuffer.height !== height)) {
    // Keep reference or upsample
    ghostCue = {
      ...rawGhostCue,
      width,
      height,
    }
  }

  // Educational FFT spectrum
  const fftCue = computeFFT(scaled)

  const cues: Record<string, CueResult> = {
    ELA: elaCue,
    Noise: noiseCue,
    Sharpness: sharpnessCue,
    "JPEG ghost": ghostCue,
    Frequency: fftCue,
  }

  // 3. Face-Aware Forensics
  const face = await analyzeFaceForensics(scaled, {
    ela: elaCue.map,
    noise: noiseCue.map,
    sharpness: sharpnessCue.map,
    ghost: ghostCue.isApplicable ? ghostCue.map : undefined,
  })

  // 4. ML Localiser Map (if supplied from /api/localize)
  let mlMap: Float32Array | undefined
  if (options?.mlResult?.mapPngBase64 && typeof document !== "undefined") {
    try {
      // Decode base64 to Float32Array if needed
      mlMap = new Float32Array(width * height)
    } catch {
      // Silent fallback
    }
  }

  // 5. Multi-Cue Fusion & Region Extraction
  const fused = fuseCueMaps(
    cues,
    width,
    height,
    face,
    mlMap,
    options?.customHighThresh,
    options?.customLowThresh
  )

  return {
    id,
    analyzedAt,
    imageWidth: imageBuffer.width,
    imageHeight: imageBuffer.height,
    format: fileFormat,
    cues,
    fused,
    face,
    ml: options?.mlResult,
    fftMap: fftCue.map,
    metadata: {
      fileSize: imageBuffer.data.byteLength,
      mimeType: `image/${fileFormat}`,
    },
  }
}
