"use client"

import React, { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ForensicsReport } from "@/lib/forensics/types"
import { Label } from "@/lib/detection/types"
import HeatmapViewer from "./HeatmapViewer"
import RegionList from "./RegionList"
import FaceTab from "./FaceTab"
import BorderBeam from "@/components/shared/BorderBeam"
import {
  Download,
  MessageSquare,
  Info,
  ShieldCheck,
  Cpu,
} from "lucide-react"

export interface ForensicsPanelProps {
  report: ForensicsReport
  verdictLabel: Label
  previewUrl: string
  onAskAdria: (summary: string) => void
}

type TabType =
  | "Fused"
  | "ELA"
  | "Noise"
  | "Sharpness"
  | "JPEG ghost"
  | "Face"
  | "ML"
  | "Frequency"
  | "Histograms"
  | "Metadata"

export default function ForensicsPanel({
  report,
  verdictLabel,
  previewUrl,
  onAskAdria,
}: ForensicsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("Fused")
  const [showAnyway, setShowAnyway] = useState(false)
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  // Gating logic
  const isLikelyAuthentic = verdictLabel === "likely_authentic"
  const isGated = isLikelyAuthentic && !showAnyway

  // ML availability
  const hasMl = Boolean(report.ml && report.ml.score !== undefined)

  // Construct tab list
  const tabList: TabType[] = [
    "Fused",
    "ELA",
    "Noise",
    "Sharpness",
    "JPEG ghost",
    "Face",
    ...(hasMl ? (["ML"] as TabType[]) : []),
    "Frequency",
    "Histograms",
    "Metadata",
  ]

  // Currently displayed heatmap data based on active tab
  const currentHeatmapData = (() => {
    switch (activeTab) {
      case "Fused":
        return report.fused.fusedMap
      case "ELA":
        return report.cues.ELA?.map || report.fused.fusedMap
      case "Noise":
        return report.cues.Noise?.map || report.fused.fusedMap
      case "Sharpness":
        return report.cues.Sharpness?.map || report.fused.fusedMap
      case "JPEG ghost":
        return report.cues["JPEG ghost"]?.map || report.fused.fusedMap
      case "Frequency":
        return report.fftMap || report.fused.fusedMap
      default:
        return report.fused.fusedMap
    }
  })()

  // Explain with ADRIA handler
  const handleExplainWithAdria = () => {
    const lines = [
      `TRACE Forensic Heatmap Summary:`,
      `Overall Detection Verdict: ${verdictLabel.replace("_", " ")}`,
      `Dominant Heatmap Discrepancy: ${(report.fused.dominantAnomaly * 100).toFixed(0)}%`,
    ]

    if (report.face.detected) {
      lines.push(
        `Face Boundary Discontinuity: ${(report.face.boundaryScore * 100).toFixed(0)}% (${report.face.summary})`
      )
    }

    if (report.fused.regions.length > 0) {
      lines.push(
        `Possible manipulation regions found: ${report.fused.regions.length}. Top observation: ${report.fused.regions[0].description} (confidence: ${report.fused.regions[0].confidence})`
      )
    } else {
      lines.push(`No specific region stood out as distinctly anomalous.`)
    }

    lines.push(
      `Please provide a calm, hedged explanation of these statistical cues and remind me what steps to take.`
    )

    onAskAdria(lines.join("\n"))
  }

  // Save Analysis Image download handler
  const handleSaveAnalysisImage = () => {
    const canvas = document.createElement("canvas")
    const w = 1200
    const h = 800
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Background
    ctx.fillStyle = "#05060A"
    ctx.fillRect(0, 0, w, h)

    // Header
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "bold 26px Palatino, Georgia, serif"
    ctx.fillText("TRACE // MULTI-CUE FORENSIC INSPECTION REPORT", 40, 50)

    ctx.fillStyle = "#8B93A7"
    ctx.font = "14px Palatino, Georgia, serif"
    ctx.fillText(
      `Date: ${new Date().toLocaleDateString()} · Assessment: ${report.id.slice(0, 12)}`,
      40,
      80
    )

    // Render Preview Image in canvas
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      ctx.drawImage(img, 40, 110, 560, 560)

      // Legend & stats
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "18px Palatino, Georgia, serif"
      ctx.fillText("Forensic Summary", 640, 140)

      ctx.fillStyle = "#8B93A7"
      ctx.font = "14px Palatino, Georgia, serif"
      ctx.fillText(`Verdict: ${verdictLabel.replace("_", " ")}`, 640, 180)
      ctx.fillText(
        `Candidate regions flagged: ${report.fused.regions.length}`,
        640,
        210
      )
      if (report.face.detected) {
        ctx.fillText(
          `Face boundary seam score: ${(report.face.boundaryScore * 100).toFixed(0)}%`,
          640,
          240
        )
      }

      // Mandatory Legal Footer
      ctx.fillStyle = "#8B93A7"
      ctx.font = "13px Palatino, Georgia, serif"
      ctx.fillText(
        `TRACE · automated analysis · ${new Date().toISOString().split("T")[0]} · not legal proof`,
        40,
        760
      )

      // Download trigger
      const link = document.createElement("a")
      link.download = `TRACE_Forensic_Analysis_${report.id.slice(0, 8)}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    }
    img.src = previewUrl
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto glass-panel p-6 md:p-10 rounded-3xl mt-12 overflow-hidden border border-white/10">
      <BorderBeam size={130} duration={7.5} intensity={0.6} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10 font-mono">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-[#00E5FF] font-semibold block mb-1">
            FORENSIC LAB // MULTI-CUE HEATMAP
          </span>
          <h3 className="text-2xl font-bold text-white font-serif tracking-tight">
            Fused Anomaly Inspection
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExplainWithAdria}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-xs font-semibold text-[#00E5FF] hover:bg-[#00E5FF]/20 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Explain with ADRIA</span>
          </button>

          <button
            onClick={handleSaveAnalysisImage}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-white/70 hover:text-white hover:border-white/20 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Save analysis image</span>
          </button>
        </div>
      </div>

      {/* Gating Banner for Likely Authentic */}
      {isGated && (
        <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-[#2CFFA7] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">
                TRACE found no strong signs of manipulation overall. Bright areas here are most likely natural.
              </p>
              <p className="text-xs text-[#8B93A7] mt-0.5">
                Maps are shown in exploratory mode. Outlines are hidden to prevent misinterpretation.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAnyway(true)}
            className="px-4 py-1.5 rounded-full border border-white/20 text-xs font-mono text-white/80 hover:text-white hover:border-[#00E5FF] transition-all whitespace-nowrap self-start sm:self-center"
          >
            Show anyway
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 border-b border-white/10 font-mono text-xs no-scrollbar">
        {tabList.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => startTransition(() => setActiveTab(tab))}
              className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap uppercase tracking-wider ${
                isActive
                  ? "bg-[#00E5FF] text-black font-semibold shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* Main Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* FUSED TAB */}
          {activeTab === "Fused" && (
            <div className="space-y-6">
              <HeatmapViewer
                originalUrl={previewUrl}
                heatmapData={report.fused.fusedMap}
                width={report.fused.width}
                height={report.fused.height}
                regions={isGated ? [] : report.fused.regions}
                face={report.face}
                isExploratory={isGated}
                selectedRegionId={selectedRegionId}
                onSelectRegion={setSelectedRegionId}
              />

              {!isGated && (
                <RegionList
                  regions={report.fused.regions}
                  selectedRegionId={selectedRegionId}
                  onSelectRegion={setSelectedRegionId}
                />
              )}
            </div>
          )}

          {/* CUE TABS (ELA, Noise, Sharpness, Ghost) */}
          {(activeTab === "ELA" ||
            activeTab === "Noise" ||
            activeTab === "Sharpness" ||
            activeTab === "JPEG ghost") && (
            <div className="space-y-4">
              {report.cues[activeTab]?.isApplicable === false ? (
                <div className="glass-panel p-8 text-center rounded-2xl">
                  <Info className="h-8 w-8 text-[#FFB020] mx-auto mb-2" />
                  <h4 className="text-base font-bold text-white mb-1">
                    Not applicable
                  </h4>
                  <p className="text-xs text-[#8B93A7]">
                    {report.cues[activeTab]?.note ||
                      "This cue is not applicable for this file format."}
                  </p>
                </div>
              ) : (
                <HeatmapViewer
                  originalUrl={previewUrl}
                  heatmapData={currentHeatmapData}
                  width={report.fused.width}
                  height={report.fused.height}
                  regions={[]}
                  isExploratory={true}
                />
              )}
            </div>
          )}

          {/* FACE TAB */}
          {activeTab === "Face" && (
            <FaceTab face={report.face} originalUrl={previewUrl} />
          )}

          {/* ML LOCALIZATION TAB */}
          {activeTab === "ML" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between font-mono text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-[#00E5FF]" />
                  <span>Model: {report.ml?.model}</span>
                </div>
                <span>Inference: {report.ml?.elapsedMs}ms</span>
              </div>
              <HeatmapViewer
                originalUrl={previewUrl}
                heatmapData={currentHeatmapData}
                width={report.fused.width}
                height={report.fused.height}
                regions={[]}
                isExploratory={true}
              />
            </div>
          )}

          {/* FREQUENCY TAB (Educational) */}
          {activeTab === "Frequency" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#8B93A7] leading-relaxed">
                2D Fourier Magnitude Spectrum: highlights grid periodicity and unnatural frequency spikes typical of generative upscalers and generative diffusion patterns.
              </div>
              <HeatmapViewer
                originalUrl={previewUrl}
                heatmapData={report.fftMap || report.fused.fusedMap}
                width={256}
                height={256}
                regions={[]}
                isExploratory={true}
              />
            </div>
          )}

          {/* HISTOGRAMS TAB */}
          {activeTab === "Histograms" && (
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <span className="font-mono text-xs uppercase tracking-widest text-[#00E5FF] block">
                CUE SPREAD & DISCREPANCY DISTRIBUTIONS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(report.cues).map(([name, cue]) => (
                  <div key={name} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 font-mono text-xs">
                    <div className="flex justify-between text-white font-semibold">
                      <span>{name}</span>
                      <span>{cue.isApplicable ? `${cue.coveragePct.toFixed(1)}% Cov` : "N/A"}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00E5FF] to-[#8B5CF6]"
                        style={{ width: `${Math.min(100, cue.coveragePct * 2)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-white/40 text-[10px]">
                      <span>Mean: {cue.mean.toFixed(3)}</span>
                      <span>P95: {cue.p95.toFixed(3)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* METADATA TAB */}
          {activeTab === "Metadata" && (
            <div className="glass-panel p-6 rounded-2xl space-y-3 font-mono text-xs">
              <span className="uppercase tracking-widest text-[#00E5FF] block mb-2">
                IMAGE CONTAINER METADATA
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white/70">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-white/40 block text-[10px]">DIMENSIONS</span>
                  <span className="text-white font-bold">{report.imageWidth} × {report.imageHeight} PX</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-white/40 block text-[10px]">FILE FORMAT</span>
                  <span className="text-white font-bold uppercase">{report.format}</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-white/40 block text-[10px]">FILE SIZE</span>
                  <span className="text-white font-bold">{(report.metadata?.fileSize ? report.metadata.fileSize / 1024 : 0).toFixed(1)} KB</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-white/40 block text-[10px]">ANALYSED AT</span>
                  <span className="text-white font-bold">{new Date(report.analyzedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Mandatory Honesty Note under every map */}
      <div className="mt-8 pt-4 border-t border-white/10 flex items-start gap-2.5 text-xs text-[#8B93A7] leading-relaxed">
        <Info className="h-4 w-4 text-[#FFB020] shrink-0 mt-0.5" />
        <p>
          Bright areas and outlines are statistical hints, not proof. Natural edges, text, logos, saturated colours, re-saved images and compression can look the same. Use this together with the verdict.
        </p>
      </div>
    </div>
  )
}
