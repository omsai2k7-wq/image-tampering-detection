"use client"

import React, { useState, useEffect } from "react"
import { notFound } from "next/navigation"
import HeatmapViewer from "@/components/forensics/HeatmapViewer"
import RegionList from "@/components/forensics/RegionList"
import {
  generateCleanImage,
  generateSpliceTamper,
  generateBlurTamper,
  generateResizeTamper,
} from "@/lib/forensics/synthetic"
import { runForensicsPipeline } from "@/lib/forensics/pipeline"
import { ForensicsReport } from "@/lib/forensics/types"
import { Sliders, RefreshCw, Cpu } from "lucide-react"

export default function ForensicsLabDevPage() {
  // Dev-only route (404 in production)
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  const [tamperType, setTamperType] = useState<"clean" | "splice" | "blur" | "resize">("splice")
  const [highThresh, setHighThresh] = useState(0.70)
  const [lowThresh, setLowThresh] = useState(0.50)
  const [report, setReport] = useState<ForensicsReport | null>(null)
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("")
  const [isComputing, setIsComputing] = useState(false)
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null)

  const regenerate = async () => {
    setIsComputing(true)
    const dim = 256
    let buffer
    if (tamperType === "clean") {
      buffer = generateCleanImage(dim, dim, 3)
    } else if (tamperType === "splice") {
      buffer = generateSpliceTamper(dim, dim, 60, 60, 75, 75).image
    } else if (tamperType === "blur") {
      buffer = generateBlurTamper(dim, dim, 70, 70, 70, 70).image
    } else {
      buffer = generateResizeTamper(dim, dim, 65, 65, 75, 75).image
    }

    // Convert to preview data URL via canvas
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas")
      canvas.width = dim
      canvas.height = dim
      const ctx = canvas.getContext("2d")
      if (ctx) {
        const imgData = new ImageData(new Uint8ClampedArray(buffer.data), dim, dim)
        ctx.putImageData(imgData, 0, 0)
        setPreviewDataUrl(canvas.toDataURL("image/png"))
      }
    }

    const rep = await runForensicsPipeline(buffer, "jpeg", {
      customHighThresh: highThresh,
      customLowThresh: lowThresh,
    })
    setReport(rep)
    setIsComputing(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      regenerate()
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamperType, highThresh, lowThresh])

  return (
    <div className="min-h-screen bg-[#05060A] text-[#E9ECF5] p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Lab Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10 font-mono">
          <div>
            <div className="flex items-center gap-2 text-[#00E5FF] text-xs font-semibold tracking-widest uppercase mb-1">
              <Cpu className="h-4 w-4" />
              <span>TRACE DEV TOOLS // INTERNAL LAB</span>
            </div>
            <h1 className="text-3xl font-bold text-white font-serif tracking-tight">
              Forensics Fusion Tuning Lab
            </h1>
          </div>

          <button
            onClick={regenerate}
            disabled={isComputing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00E5FF] text-black text-xs font-bold hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isComputing ? "animate-spin" : ""}`} />
            <span>Regenerate Case</span>
          </button>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          {/* Tamper Generator Selection */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
            <span className="text-white/60 uppercase tracking-wider block">
              Synthetic Tamper Type
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["clean", "splice", "blur", "resize"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTamperType(t)}
                  className={`py-2 px-3 rounded-lg uppercase tracking-wider transition-colors ${
                    tamperType === t
                      ? "bg-[#00E5FF] text-black font-bold"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Threshold Sliders */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 md:col-span-2">
            <div className="flex items-center justify-between text-white/60 uppercase tracking-wider">
              <span>Hysteresis Sensitivity Thresholds</span>
              <Sliders className="h-4 w-4 text-[#8B5CF6]" />
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-white/80 mb-1">
                  <span>High Threshold (Seed): {(highThresh * 100).toFixed(0)}%</span>
                  <span className="text-white/40">Default: 70%</span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="85"
                  value={Math.round(highThresh * 100)}
                  onChange={(e) => setHighThresh(Number(e.target.value) / 100)}
                  className="w-full accent-[#00E5FF]"
                />
              </div>

              <div>
                <div className="flex justify-between text-white/80 mb-1">
                  <span>Low Threshold (Grow): {(lowThresh * 100).toFixed(0)}%</span>
                  <span className="text-white/40">Default: 50%</span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="65"
                  value={Math.round(lowThresh * 100)}
                  onChange={(e) => setLowThresh(Number(e.target.value) / 100)}
                  className="w-full accent-[#8B5CF6]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Forensic Inspection */}
        {report && previewDataUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8">
              <HeatmapViewer
                originalUrl={previewDataUrl}
                heatmapData={report.fused.fusedMap}
                width={report.fused.width}
                height={report.fused.height}
                regions={report.fused.regions}
                face={report.face}
                selectedRegionId={selectedRegionId}
                onSelectRegion={setSelectedRegionId}
              />
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel p-5 rounded-2xl border border-white/10 font-mono text-xs space-y-2">
                <span className="text-[#00E5FF] uppercase tracking-wider block font-bold">
                  DIAGNOSTIC METRICS
                </span>
                <div className="flex justify-between text-white/70">
                  <span>Flagged Regions:</span>
                  <span className="text-white font-bold">{report.fused.regions.length}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Peak Anomaly:</span>
                  <span className="text-white font-bold">{(report.fused.dominantAnomaly * 100).toFixed(1)}%</span>
                </div>
              </div>

              <RegionList
                regions={report.fused.regions}
                selectedRegionId={selectedRegionId}
                onSelectRegion={setSelectedRegionId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
