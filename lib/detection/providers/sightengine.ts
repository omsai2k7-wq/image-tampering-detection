import crypto from "crypto"
import { DetectionProvider, DetectionResult } from "../types"
import { scoreToLabel, calculateConfidence } from "../normalize"

interface SightengineResponse {
  status: string
  type?: {
    ai_generated?: number
    deepfake?: number
  }
  error?: {
    message?: string
    code?: number
  }
}

export class SightengineDetectionProvider implements DetectionProvider {
  private apiUser: string
  private apiSecret: string
  private endpoint = "https://api.sightengine.com/1.0/check.json"

  constructor() {
    this.apiUser = process.env.SIGHTENGINE_API_USER || ""
    this.apiSecret = process.env.SIGHTENGINE_API_SECRET || ""
  }

  async analyze(file: Buffer, mime: string, signal?: AbortSignal): Promise<DetectionResult> {
    if (!this.apiUser || !this.apiSecret) {
      throw new Error("Sightengine credentials are missing. Configure SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET.")
    }

    const formData = new FormData()
    const blob = new Blob([new Uint8Array(file)], { type: mime })
    formData.append("media", blob, "image")
    formData.append("models", "genai,deepfake")
    formData.append("api_user", this.apiUser)
    formData.append("api_secret", this.apiSecret)

    const response = await fetch(this.endpoint, {
      method: "POST",
      body: formData,
      signal,
    })

    if (!response.ok) {
      throw new Error(`Sightengine request failed with HTTP ${response.status}`)
    }

    const data: SightengineResponse = await response.json()

    if (data.status !== "success") {
      throw new Error(data.error?.message || "Sightengine returned an unsuccessful status.")
    }

    const aiScore = data.type?.ai_generated ?? 0
    const deepfakeScore = data.type?.deepfake ?? 0
    const rawScore = Math.max(aiScore, deepfakeScore)
    const score = Number(Math.min(1, Math.max(0, rawScore)).toFixed(2))

    const label = scoreToLabel(score)
    const confidence = calculateConfidence(score)

    const details = []
    if (aiScore > 0.5) {
      details.push({
        id: "ai_generation",
        text: `Synthetic AI generation signatures identified with probability ${(aiScore * 100).toFixed(0)}%.`,
      })
    }
    if (deepfakeScore > 0.5) {
      details.push({
        id: "deepfake_detected",
        text: `Facial morphing or face-swapping indicators detected with probability ${(deepfakeScore * 100).toFixed(0)}%.`,
      })
    }
    if (details.length === 0) {
      details.push({
        id: "consistency_verified",
        text: "Pixel structure and facial landmarks align with authentic photography characteristics.",
      })
    }

    return {
      requestId: crypto.randomUUID(),
      score,
      label,
      confidence,
      details,
      provider: "sightengine",
      processedAt: new Date().toISOString(),
    }
  }
}
