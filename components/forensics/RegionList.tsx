"use client"

import React from "react"
import { RegionOutline } from "@/lib/forensics/types"
import { ChevronRight, CheckCircle2 } from "lucide-react"

export interface RegionListProps {
  regions: RegionOutline[]
  selectedRegionId?: number | null
  onSelectRegion?: (id: number) => void
}

export default function RegionList({
  regions,
  selectedRegionId,
  onSelectRegion,
}: RegionListProps) {
  if (regions.length === 0) {
    return (
      <div className="w-full glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
        <CheckCircle2 className="h-8 w-8 text-[#00E5FF]/60 mb-2" />
        <h4 className="text-base font-bold text-white mb-1">
          No region stood out
        </h4>
        <p className="text-xs text-[#8B93A7] max-w-sm">
          No distinct cluster exceeded both hysteresis thresholds across independent cues.
        </p>
      </div>
    )
  }

  const confidenceBadge = {
    high: "bg-[#FF2E4D]/10 text-[#FF2E4D] border-[#FF2E4D]/30",
    medium: "bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30",
    low: "bg-white/10 text-white/60 border-white/10",
  }

  const cueColors: Record<string, string> = {
    ELA: "bg-[#00E5FF]",
    Noise: "bg-[#8B5CF6]",
    "JPEG ghost": "bg-[#FFB020]",
    Sharpness: "bg-[#2CFFA7]",
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#00E5FF]">
          POSSIBLE MANIPULATION REGIONS ({regions.length})
        </span>
        <span className="font-mono text-[11px] text-white/40">
          RANKED BY DISCREPANCY
        </span>
      </div>

      <div className="space-y-2.5">
        {regions.map((region) => {
          const isSelected = selectedRegionId === region.id

          return (
            <div
              key={region.id}
              onClick={() => onSelectRegion?.(region.id)}
              className={`glass-panel p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                isSelected
                  ? "border-[#00E5FF] bg-[#00E5FF]/5 shadow-[0_0_20px_rgba(0,229,255,0.12)]"
                  : "border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00E5FF]/20 text-[11px] font-bold text-[#00E5FF]">
                    {region.id}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    Possible manipulation region {region.id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                      confidenceBadge[region.confidence]
                    }`}
                  >
                    {region.confidence} confidence
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/40" />
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-[#8B93A7] leading-relaxed">
                {region.description}
              </p>

              {/* Statistics & Cue Stack Bar */}
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-white/50">
                <div className="flex items-center gap-3">
                  <span>Area: {region.areaPct}%</span>
                  <span>Agreement: {region.agreementText}</span>
                </div>

                {/* Contributing Cue Bar */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-white/40">Cues:</span>
                  <div className="flex items-center gap-1">
                    {region.cuesContributed.map((c) => (
                      <span
                        key={c}
                        className={`h-2 w-2 rounded-full ${cueColors[c] || "bg-white/40"}`}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
