export type Label = "likely_authentic" | "suspicious" | "likely_manipulated"

export interface DetectionDetail {
  id: string
  text: string
}

export interface DetectionResult {
  requestId: string
  score: number
  label: Label
  confidence: "low" | "medium" | "high"
  details: DetectionDetail[]
  heatmapUrl?: string
  provider: string
  processedAt: string
}

export interface DetectionProvider {
  analyze(file: Buffer, mime: string, signal?: AbortSignal): Promise<DetectionResult>
}
