import { Label } from "./types"

export const SCORE_THRESHOLDS = {
  AUTHENTIC_MAX: 0.35,
  SUSPICIOUS_MAX: 0.65,
} as const

export function scoreToLabel(score: number): Label {
  if (score < SCORE_THRESHOLDS.AUTHENTIC_MAX) {
    return "likely_authentic"
  }
  if (score <= SCORE_THRESHOLDS.SUSPICIOUS_MAX) {
    return "suspicious"
  }
  return "likely_manipulated"
}

export function calculateConfidence(score: number): "low" | "medium" | "high" {
  if (score <= 0.15 || score >= 0.85) {
    return "high"
  }
  if (score <= 0.3 || score >= 0.7) {
    return "medium"
  }
  return "low"
}
