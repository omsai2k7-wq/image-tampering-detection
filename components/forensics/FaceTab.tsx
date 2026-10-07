"use client"

import React from "react"
import { FaceForensics } from "@/lib/forensics/types"
import { User, ShieldAlert, CheckCircle2 } from "lucide-react"

export interface FaceTabProps {
  face: FaceForensics
  originalUrl: string
}

export default function FaceTab({ face, originalUrl }: FaceTabProps) {
  if (!face.detected || !face.box) {
    return (
      <div className="w-full glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center">
        <User className="h-10 w-10 text-white/30 mb-3" />
        <h4 className="text-lg font-bold text-white mb-2">No Face Detected</h4>
        <p className="text-sm text-[#8B93A7] max-w-md">
          {face.summary || "No face detected; analysing the whole image only."}
        </p>
      </div>
    )
  }

  const [bx, by, bw, bh] = face.box

  return (
    <div className="w-full space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Cropped Face Viewport */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="relative h-64 w-64 rounded-2xl overflow-hidden border-2 border-[#00E5FF]/40 bg-black/70 shadow-[0_0_30px_rgba(0,229,255,0.15)] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={originalUrl}
              alt="Face crop"
              draggable={false}
              className="absolute max-none pointer-events-none"
              style={{
                width: `${100 / bw}%`,
                height: `${100 / bh}%`,
                left: `${-bx * (100 / bw)}%`,
                top: `${-by * (100 / bh)}%`,
              }}
            />
            {/* Target Reticle */}
            <div className="absolute inset-2 border border-[#00E5FF]/30 rounded-xl pointer-events-none" />
          </div>

          <span className="font-mono text-[11px] text-white/40 uppercase mt-2">
            FACIAL ROI // 478 LANDMARKS
          </span>
        </div>

        {/* Right: Blend Boundary Meter & Summary */}
        <div className="md:col-span-7 flex flex-col space-y-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#00E5FF] block mb-1">
              BLEND-BOUNDARY SEAM SCORE
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold tracking-tight text-white font-serif">
                {(face.boundaryScore * 100).toFixed(0)}%
              </span>
              <span className="text-xs font-mono text-[#8B93A7]">
                {face.boundaryScore >= 0.6
                  ? "Elevated perimeter discontinuity"
                  : face.boundaryScore >= 0.4
                  ? "Moderate boundary variance"
                  : "Smooth contextual integration"}
              </span>
            </div>
          </div>

          {/* 24-Segment Arc Visualizer Bar */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-white/50">
              24-Segment Perimeter Continuity:
            </span>
            <div className="grid grid-cols-12 gap-1 p-2 rounded-xl bg-white/[0.03] border border-white/5">
              {face.boundarySegments.map((seg, i) => (
                <div
                  key={i}
                  className="h-5 rounded-[2px] transition-all"
                  style={{
                    backgroundColor:
                      seg >= 0.65
                        ? "#FF2E4D"
                        : seg >= 0.45
                        ? "#FFB020"
                        : "#00E5FF",
                    opacity: 0.25 + seg * 0.75,
                  }}
                  title={`Segment ${i + 1}: ${(seg * 100).toFixed(0)}% discontinuity`}
                />
              ))}
            </div>
          </div>

          {/* Hedged Summary */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#8B93A7] leading-relaxed">
            {face.summary}
          </div>
        </div>
      </div>

      {/* Part Anomaly Badges */}
      <div className="space-y-3">
        <span className="font-mono text-xs uppercase tracking-widest text-white/60">
          FACIAL FEATURE RESIDUAL ANOMALIES
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {face.regions.map((part) => {
            const isHigh = part.anomalyScore >= 0.6
            const isMed = part.anomalyScore >= 0.4

            return (
              <div
                key={part.name}
                className="glass-panel p-3 rounded-xl border border-white/10 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    {part.name.replace("_", " ")}
                  </span>
                  {isHigh ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-[#FF2E4D]" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#2CFFA7]" />
                  )}
                </div>

                <div className="text-lg font-bold text-white font-serif">
                  {(part.anomalyScore * 100).toFixed(0)}%
                </div>

                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] font-mono text-white/40 flex justify-between">
                  <span>z-dev</span>
                  <span>{isHigh ? "Elevated" : isMed ? "Moderate" : "Nominal"}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
