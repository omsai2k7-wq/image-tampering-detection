export interface CueResult {
  name: "ELA" | "Noise" | "Sharpness" | "JPEG ghost" | "Frequency"
  map: Float32Array
  width: number
  height: number
  coveragePct: number // % of valid pixels > 0.6
  mean: number
  p95: number
  isApplicable: boolean
  note?: string
}

export interface FacialPartAnomaly {
  name: "face_oval" | "left_eye" | "right_eye" | "nose" | "lips" | "jawline"
  anomalyScore: number // robust |z| against background
  cues: {
    noise: number
    sharpness: number
    ela: number
    ghost: number
  }
}

export interface FaceForensics {
  detected: boolean
  box?: [number, number, number, number] // [x, y, w, h] normalized 0..1
  landmarksCount?: number
  regions: FacialPartAnomaly[]
  boundarySegments: number[] // 24 segments, 0..1 discontinuity score
  boundaryScore: number // 75th percentile of segments
  summary: string // hedged wording
  note?: string
}

export interface RegionOutline {
  id: number
  bbox: [number, number, number, number] // [x, y, width, height] normalized 0..1
  polygon: [number, number][] // simplified contour coordinates normalized 0..1
  areaPct: number // % of total image area
  meanScore: number // 0..1 mean fused score
  agreementCount: number
  agreementText: string // e.g. "3 of 4"
  cuesContributed: string[] // e.g. ["ELA", "Noise", "Ghost"]
  overlapsFace: boolean
  overlapsBoundary: boolean
  confidence: "high" | "medium" | "low"
  description: string // hedged plain text
}

export interface FusedResult {
  fusedMap: Float32Array
  agreementMap: Float32Array
  width: number
  height: number
  regions: RegionOutline[]
  cuesUsed: string[]
  dominantAnomaly: number
}

export interface ForensicsReport {
  id: string
  analyzedAt: string
  imageWidth: number
  imageHeight: number
  format: "jpeg" | "png" | "webp" | "unknown"
  cues: Record<string, CueResult>
  fused: FusedResult
  face: FaceForensics
  ml?: {
    score: number
    mapPngBase64?: string
    mapUrl?: string
    model: string
    version?: string
    elapsedMs?: number
  }
  fftMap?: Float32Array
  metadata?: {
    fileSize: number
    mimeType: string
    colorSpace?: string
  }
}
