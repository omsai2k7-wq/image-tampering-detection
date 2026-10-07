"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Dropzone from "./Dropzone"
import PreviewCard from "./PreviewCard"
import ProcessingStage from "./ProcessingStage"
import ResultPanel from "./ResultPanel"
import ForensicsPanel from "@/components/forensics/ForensicsPanel"
import { useAnalyze } from "@/hooks/useAnalyze"
import { useBackgroundState } from "@/lib/context/BackgroundContext"
import { DetectionResult } from "@/lib/detection/types"
import { ForensicsReport } from "@/lib/forensics/types"
import { runForensicsPipeline } from "@/lib/forensics/pipeline"
import { ImageBuffer } from "@/lib/forensics/ela"
import { en } from "@/lib/i18n/en"
import { AlertCircle, RefreshCw } from "lucide-react"

export type Phase = "idle" | "ready" | "processing" | "result" | "error"

interface AnalyzeZoneProps {
  onAskAdria: (summary: string) => void
}

async function decodeFileToBuffer(file: File): Promise<ImageBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas context unavailable"))
        return
      }
      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      resolve({
        width: canvas.width,
        height: canvas.height,
        data: imgData.data,
      })
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

export default function AnalyzeZone({ onAskAdria }: AnalyzeZoneProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null)
  const [forensicsReport, setForensicsReport] = useState<ForensicsReport | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")

  const { setPhase: setBgPhase, setVerdict: setBgVerdict } = useBackgroundState()

  // Sync phase and verdict with persistent background
  useEffect(() => {
    setBgPhase(phase)
    if (phase === "result" && detectionResult?.label) {
      setBgVerdict(detectionResult.label)
    } else {
      setBgVerdict(null)
    }
  }, [phase, detectionResult, setBgPhase, setBgVerdict])

  const { run, cancel } = useAnalyze()
  const processingStartTimeRef = useRef<number>(0)
  const strings = en.analyze

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileSelected = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(url)
    setPhase("ready")
  }

  const handleStartAnalysis = async () => {
    if (!selectedFile) return
    setPhase("processing")
    processingStartTimeRef.current = performance.now()

    // 1. Detection API promise
    const apiPromise = run(selectedFile)

    // 2. Client-side Forensics Pipeline
    const format = selectedFile.type.includes("png")
      ? "png"
      : selectedFile.type.includes("webp")
      ? "webp"
      : "jpeg"

    const forensicsPromise = (async () => {
      try {
        const buffer = await decodeFileToBuffer(selectedFile)

        // Check if ML service is enabled
        let mlResult = undefined
        if (process.env.NEXT_PUBLIC_FORENSICS_SERVICE_ENABLED === "true") {
          try {
            const formData = new FormData()
            formData.append("image", selectedFile)
            const mlRes = await fetch("/api/localize", {
              method: "POST",
              body: formData,
            })
            if (mlRes.ok) {
              const data = await mlRes.json()
              if (data.available) {
                mlResult = data
              }
            }
          } catch {
            // Silent fallback to classical fusion
          }
        }

        const rep = await runForensicsPipeline(buffer, format, { mlResult })
        return rep
      } catch (err) {
        console.warn("Forensics analysis encountered error, generating fallback report:", err)
        return null
      }
    })()

    // 3. Enforce min 3.5s animation duration in UI layer
    const minTimePromise = new Promise((resolve) => setTimeout(resolve, 3500))

    try {
      const [result, report] = await Promise.all([
        apiPromise,
        forensicsPromise,
        minTimePromise,
      ])

      if (result) {
        setDetectionResult(result)
        setForensicsReport(report)
        setPhase("result")
      } else {
        setErrorMessage(strings.errors.generic)
        setPhase("error")
      }
    } catch {
      setErrorMessage(strings.errors.generic)
      setPhase("error")
    }
  }

  const handleCancel = () => {
    cancel()
    setPhase("ready")
  }

  const handleReset = () => {
    cancel()
    setSelectedFile(null)
    setDetectionResult(null)
    setForensicsReport(null)
    setErrorMessage("")
    setPhase("idle")
  }

  // Active step calculation for step indicator
  const getActiveStep = () => {
    if (phase === "idle" || phase === "ready") return 1
    if (phase === "processing") return 2
    return 3
  }

  const activeStep = getActiveStep()

  return (
    <section id="analyze" className="relative py-28 md:py-40 px-6 md:px-12 max-w-7xl mx-auto">
      {/* 3 Step Interactive Progress Indicator */}
      <div className="flex items-center justify-center gap-4 md:gap-8 mb-16 font-mono text-xs md:text-sm tracking-[0.2em] uppercase">
        <span
          className={`transition-colors duration-300 ${
            activeStep === 1
              ? "text-[#00E5FF] font-bold drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
              : "text-white/40"
          }`}
        >
          {strings.step1}
        </span>
        <span className="text-white/20">→</span>
        <span
          className={`transition-colors duration-300 ${
            activeStep === 2
              ? "text-[#00E5FF] font-bold drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
              : "text-white/40"
          }`}
        >
          {strings.step2}
        </span>
        <span className="text-white/20">→</span>
        <span
          className={`transition-colors duration-300 ${
            activeStep === 3
              ? "text-[#00E5FF] font-bold drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
              : "text-white/40"
          }`}
        >
          {strings.step3}
        </span>
      </div>

      {/* Main State Machine Viewport */}
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(12px)", y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <Dropzone onFileSelected={handleFileSelected} />
          </motion.div>
        )}

        {phase === "ready" && selectedFile && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(12px)", y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <PreviewCard
              file={selectedFile}
              onProceed={handleStartAnalysis}
              onReset={handleReset}
            />
          </motion.div>
        )}

        {phase === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(12px)", y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <ProcessingStage
              previewUrl={previewUrl}
              onCancel={handleCancel}
            />
          </motion.div>
        )}

        {phase === "result" && detectionResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(12px)", y: -16 }}
            transition={{ duration: 0.4 }}
            className="space-y-12"
          >
            <ResultPanel
              result={detectionResult}
              previewUrl={previewUrl}
              onReset={handleReset}
              onAskAdria={onAskAdria}
            />

            {forensicsReport && (
              <ForensicsPanel
                report={forensicsReport}
                verdictLabel={detectionResult.label}
                previewUrl={previewUrl}
                onAskAdria={onAskAdria}
              />
            )}
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(12px)", y: -16 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-lg mx-auto glass-panel p-8 text-center flex flex-col items-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF2E4D]/10 text-[#FF2E4D] border border-[#FF2E4D]/20 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
            <p className="text-[#8B93A7] text-sm mb-6 leading-relaxed">
              {errorMessage || strings.errors.generic}
            </p>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              {strings.errors.retry}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
