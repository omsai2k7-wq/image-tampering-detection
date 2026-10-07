import { CueResult, FaceForensics, FusedResult } from "./types"
import { gaussianBlur, clamp } from "./image-utils"
import { extractRegions, HYSTERESIS_HIGH, HYSTERESIS_LOW } from "./regions"

// Constants
export const FUSION_WEIGHTS: Record<string, number> = {
  ELA: 0.30,
  Noise: 0.25,
  "JPEG ghost": 0.20,
  Sharpness: 0.15,
}

export const AGREEMENT_THRESHOLD = 0.60
export const FACE_AMPLIFICATION = 1.15

/**
 * Fuse available forensic cues into a single unified manipulation heatmap
 */
export function fuseCueMaps(
  cues: Record<string, CueResult>,
  width: number,
  height: number,
  face?: FaceForensics,
  mlMap?: Float32Array,
  customHighThresh?: number,
  customLowThresh?: number
): FusedResult {
  const totalPixels = width * height

  // 1. Determine available cues and re-normalize weights
  const activeCues: { name: string; map: Float32Array; weight: number }[] = []
  let totalWeight = 0

  for (const [name, defaultWeight] of Object.entries(FUSION_WEIGHTS)) {
    const cue = cues[name]
    if (cue && cue.isApplicable && cue.map && cue.map.length === totalPixels) {
      activeCues.push({ name, map: cue.map, weight: defaultWeight })
      totalWeight += defaultWeight
    }
  }

  // Fallback if no cues available
  if (activeCues.length === 0 || totalWeight <= 0) {
    return {
      fusedMap: new Float32Array(totalPixels),
      agreementMap: new Float32Array(totalPixels),
      width,
      height,
      regions: [],
      cuesUsed: [],
      dominantAnomaly: 0,
    }
  }

  // Normalize weights
  const normalizedCues = activeCues.map((c) => ({
    ...c,
    weight: c.weight / totalWeight,
  }))

  const cuesUsed = normalizedCues.map((c) => c.name)

  // 2. Weighted Mean and Agreement Map
  const weightedMean = new Float32Array(totalPixels)
  const agreementMap = new Float32Array(totalPixels)
  const numAvailable = normalizedCues.length

  for (let i = 0; i < totalPixels; i++) {
    let wm = 0
    let agreed = 0

    for (const cue of normalizedCues) {
      const val = cue.map[i]
      wm += val * cue.weight
      if (val >= AGREEMENT_THRESHOLD) {
        agreed++
      }
    }

    weightedMean[i] = wm
    agreementMap[i] = agreed / numAvailable
  }

  // 3. Classical Fused = 0.6 * weightedMean + 0.4 * agreement
  const rawFused = new Float32Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    rawFused[i] = 0.6 * weightedMean[i] + 0.4 * agreementMap[i]
  }

  // Gaussian smooth (sigma ~ 1.5% of the shorter side)
  const shorterSide = Math.min(width, height)
  const sigma = Math.max(1.0, shorterSide * 0.015)
  const fused = gaussianBlur(rawFused, width, height, sigma)

  // 4. Face Amplification: If faces found, multiply by 1.15 inside face oval and boundary
  if (face && face.detected && face.box) {
    const [bx, by, bw, bh] = face.box
    const minX = Math.floor(bx * width)
    const maxX = Math.ceil((bx + bw) * width)
    const minY = Math.floor(by * height)
    const maxY = Math.ceil((by + bh) * height)

    for (let y = Math.max(0, minY); y < Math.min(height, maxY); y++) {
      const row = y * width
      for (let x = Math.max(0, minX); x < Math.min(width, maxX); x++) {
        fused[row + x] = clamp(fused[row + x] * FACE_AMPLIFICATION, 0, 1)
      }
    }
  }

  // 5. If ML localiser map is available: fused = 0.6 * mlMap + 0.4 * classicalFused
  if (mlMap && mlMap.length === totalPixels) {
    for (let i = 0; i < totalPixels; i++) {
      fused[i] = clamp(0.6 * mlMap[i] + 0.4 * fused[i], 0, 1)
    }
  }

  // 6. Extract manipulation regions via Hysteresis
  const regions = extractRegions(
    fused,
    agreementMap,
    cues,
    width,
    height,
    face,
    customHighThresh ?? HYSTERESIS_HIGH,
    customLowThresh ?? HYSTERESIS_LOW
  )

  // Max anomaly observed
  let maxAnomaly = 0
  for (let i = 0; i < totalPixels; i++) {
    if (fused[i] > maxAnomaly) maxAnomaly = fused[i]
  }

  return {
    fusedMap: fused,
    agreementMap,
    width,
    height,
    regions,
    cuesUsed,
    dominantAnomaly: Number(maxAnomaly.toFixed(3)),
  }
}
