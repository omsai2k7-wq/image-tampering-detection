"use client"

import { useState, useRef, useCallback } from "react"
import { z } from "zod"
import { DetectionResult } from "@/lib/detection/types"

const DetectionResultSchema = z.object({
  requestId: z.string(),
  score: z.number(),
  label: z.enum(["likely_authentic", "suspicious", "likely_manipulated"]),
  confidence: z.enum(["low", "medium", "high"]),
  details: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
    })
  ),
  heatmapUrl: z.string().optional(),
  provider: z.string(),
  processedAt: z.string(),
})

export type AnalyzeStatus = "idle" | "loading" | "success" | "error"

export function useAnalyze() {
  const [status, setStatus] = useState<AnalyzeStatus>("idle")
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setStatus("idle")
  }, [])

  const run = useCallback(async (file: File): Promise<DetectionResult | null> => {
    setStatus("loading")
    setError(null)
    setResult(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data?.error?.message || "Analysis request failed."
        setError(errorMsg)
        setStatus("error")
        return null
      }

      const parsed = DetectionResultSchema.parse(data)
      setResult(parsed)
      setStatus("success")
      return parsed
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setStatus("idle")
        return null
      }
      const message = err instanceof Error ? err.message : "An unexpected error occurred."
      setError(message)
      setStatus("error")
      return null
    } finally {
      abortControllerRef.current = null
    }
  }, [])

  return {
    run,
    cancel,
    status,
    result,
    error,
  }
}
