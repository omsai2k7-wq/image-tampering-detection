"use client"

import React, { useRef, useEffect, useState, useMemo } from "react"
import { RegionOutline, FaceForensics } from "@/lib/forensics/types"
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  User,
  Sliders,
  Layers,
  SplitSquareVertical,
} from "lucide-react"

export interface HeatmapViewerProps {
  originalUrl: string
  heatmapData: Float32Array
  width: number
  height: number
  regions: RegionOutline[]
  face?: FaceForensics
  isExploratory?: boolean
  selectedRegionId?: number | null
  onSensitivityChange?: (value: number) => void
  onSelectRegion?: (id: number) => void
}

export default function HeatmapViewer({
  originalUrl,
  heatmapData,
  width,
  height,
  regions,
  face,
  isExploratory = false,
  selectedRegionId,
  onSensitivityChange,
  onSelectRegion,
}: HeatmapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null)

  // Viewer state
  const [opacity, setOpacity] = useState(0.65)
  const [sensitivity, setSensitivity] = useState(50)
  const [colormap, setColormap] = useState<"brand" | "classic">("brand")
  const [showOutlines, setShowOutlines] = useState(!isExploratory)
  const [showFaceBoundary, setShowFaceBoundary] = useState(true)
  const [compareSplit, setCompareSplit] = useState(100) // 0..100%
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  // Render heatmap onto offscreen canvas whenever data or colormap changes
  useEffect(() => {
    const canvas = heatmapCanvasRef.current
    if (!canvas || !heatmapData || width === 0 || height === 0) return

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const imgData = ctx.createImageData(width, height)
    const buf = imgData.data

    for (let i = 0; i < heatmapData.length; i++) {
      const v = Math.max(0, Math.min(1, heatmapData[i]))
      const idx = i * 4

      if (colormap === "brand") {
        // Brand colormap: transparent/deep -> cyan (#00E5FF) -> violet (#8B5CF6) -> white
        if (v < 0.2) {
          const t = v / 0.2
          buf[idx] = Math.round(5 * t)
          buf[idx + 1] = Math.round(150 * t)
          buf[idx + 2] = Math.round(220 * t)
          buf[idx + 3] = Math.round(180 * t)
        } else if (v < 0.6) {
          const t = (v - 0.2) / 0.4
          buf[idx] = Math.round(0 * (1 - t) + 139 * t)
          buf[idx + 1] = Math.round(229 * (1 - t) + 92 * t)
          buf[idx + 2] = Math.round(255 * (1 - t) + 246 * t)
          buf[idx + 3] = 230
        } else {
          const t = (v - 0.6) / 0.4
          buf[idx] = Math.round(139 * (1 - t) + 255 * t)
          buf[idx + 1] = Math.round(92 * (1 - t) + 255 * t)
          buf[idx + 2] = Math.round(246 * (1 - t) + 255 * t)
          buf[idx + 3] = 250
        }
      } else {
        // Classic turbo/jet colormap (blue -> cyan -> yellow -> red)
        if (v < 0.25) {
          const t = v / 0.25
          buf[idx] = 0
          buf[idx + 1] = Math.round(255 * t)
          buf[idx + 2] = 255
          buf[idx + 3] = Math.round(200 * t)
        } else if (v < 0.5) {
          const t = (v - 0.25) / 0.25
          buf[idx] = 0
          buf[idx + 1] = 255
          buf[idx + 2] = Math.round(255 * (1 - t))
          buf[idx + 3] = 220
        } else if (v < 0.75) {
          const t = (v - 0.5) / 0.25
          buf[idx] = Math.round(255 * t)
          buf[idx + 1] = 255
          buf[idx + 2] = 0
          buf[idx + 3] = 240
        } else {
          const t = (v - 0.75) / 0.25
          buf[idx] = 255
          buf[idx + 1] = Math.round(255 * (1 - t))
          buf[idx + 2] = 0
          buf[idx + 3] = 255
        }
      }
    }

    ctx.putImageData(imgData, 0, 0)
  }, [heatmapData, width, height, colormap])

  // Fly to face bounding box
  const handleFaceFocus = () => {
    if (!face?.box) return
    const [bx, by, bw, bh] = face.box
    const centerX = bx + bw / 2
    const centerY = by + bh / 2
    const newZoom = Math.min(3.5, Math.max(1.5, 0.7 / Math.max(bw, bh)))
    setZoom(newZoom)
    setPan({
      x: -(centerX - 0.5) * 400 * newZoom,
      y: -(centerY - 0.5) * 400 * newZoom,
    })
  }

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsPanning(true)
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    setPan({
      x: panStartRef.current.panX + dx,
      y: panStartRef.current.panY + dy,
    })
  }

  const handleMouseUp = () => setIsPanning(false)

  // Reset zoom & pan
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setCompareSplit(100)
  }

  // Generate 24 segment points for face arc
  const boundaryArcSvg = useMemo(() => {
    if (!face || !face.detected || !face.box || !showFaceBoundary) return null
    const [bx, by, bw, bh] = face.box
    const cx = (bx + bw / 2) * 100
    const cy = (by + bh / 2) * 100
    const rx = (bw / 2) * 100
    const ry = (bh / 2) * 100

    return (
      <g className="face-boundary-arc">
        {face.boundarySegments.map((score, idx) => {
          const startAngle = (idx / 24) * 2 * Math.PI - Math.PI / 2
          const endAngle = ((idx + 1) / 24) * 2 * Math.PI - Math.PI / 2

          const x1 = cx + rx * Math.cos(startAngle)
          const y1 = cy + ry * Math.sin(startAngle)
          const x2 = cx + rx * Math.cos(endAngle)
          const y2 = cy + ry * Math.sin(endAngle)

          const strokeOpacity = 0.25 + score * 0.75
          const strokeWidth = 1.2 + score * 1.5

          return (
            <path
              key={idx}
              d={`M ${x1} ${y1} A ${rx} ${ry} 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke="#00E5FF"
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              style={{
                filter: score > 0.5 ? "drop-shadow(0 0 4px #00E5FF)" : "none",
                transition: "stroke-opacity 0.3s ease",
              }}
            />
          )
        })}
      </g>
    )
  }, [face, showFaceBoundary])

  return (
    <div className="flex flex-col w-full rounded-2xl bg-black/60 border border-white/10 overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-white/10 bg-white/[0.02] text-xs font-mono">
        {/* Left: Toggles & Colormap */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setColormap("brand")}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                colormap === "brand" ? "bg-[#00E5FF] text-black font-semibold" : "text-white/60 hover:text-white"
              }`}
            >
              Brand
            </button>
            <button
              onClick={() => setColormap("classic")}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                colormap === "classic" ? "bg-[#00E5FF] text-black font-semibold" : "text-white/60 hover:text-white"
              }`}
            >
              Classic
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-white/70 hover:text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOutlines}
              onChange={(e) => setShowOutlines(e.target.checked)}
              className="accent-[#00E5FF] rounded"
            />
            <span>Outlines</span>
          </label>

          {face?.detected && (
            <label className="flex items-center gap-1.5 text-white/70 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showFaceBoundary}
                onChange={(e) => setShowFaceBoundary(e.target.checked)}
                className="accent-[#00E5FF] rounded"
              />
              <span>Face Arc</span>
            </label>
          )}
        </div>

        {/* Right: Zoom & Navigation */}
        <div className="flex items-center gap-2">
          {face?.detected && (
            <button
              onClick={handleFaceFocus}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[#00E5FF] hover:bg-white/10 transition-colors"
              title="Focus Face"
            >
              <User className="h-3 w-3" />
              <span>Face</span>
            </button>
          )}

          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
            title="Reset View"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full h-[520px] bg-[#05060A] overflow-hidden flex items-center justify-center select-none ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isPanning ? "none" : "transform 0.2s ease-out",
          }}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          {/* Base Original Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={originalUrl}
            alt="Original forensic inspection"
            draggable={false}
            className="max-h-[480px] max-w-full object-contain pointer-events-none rounded-lg"
          />

          {/* Heatmap Overlay with Split Compare Clip */}
          <div
            className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden"
            style={{
              clipPath: `polygon(0 0, ${compareSplit}% 0, ${compareSplit}% 100%, 0 100%)`,
              opacity,
            }}
          >
            <canvas
              ref={heatmapCanvasRef}
              className="w-full h-full object-contain"
            />
          </div>

          {/* SVG Overlay: Region Outlines & Face Boundary Arc */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Face Boundary Arc */}
            {boundaryArcSvg}

            {/* Glowing Region Outlines */}
            {showOutlines &&
              regions.map((reg) => {
                if (reg.polygon.length < 3) return null
                const pointsStr = reg.polygon.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")
                const isSelected = selectedRegionId === reg.id
                const strokeColor = isSelected ? "#00E5FF" : "rgba(255, 255, 255, 0.85)"
                const glowFilter = isSelected ? "drop-shadow(0 0 8px #00E5FF)" : "drop-shadow(0 0 4px rgba(0,229,255,0.6))"

                // Center for badge
                const [bx, by, bw, bh] = reg.bbox
                const badgeX = (bx + bw / 2) * 100
                const badgeY = (by + bh / 2) * 100

                return (
                  <g key={reg.id} className="cursor-pointer pointer-events-auto" onClick={() => onSelectRegion?.(reg.id)}>
                    <polygon
                      points={pointsStr}
                      fill={isSelected ? "rgba(0, 229, 255, 0.15)" : "rgba(0, 229, 255, 0.05)"}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? "1.8" : "1.2"}
                      strokeDasharray="4 2"
                      style={{ filter: glowFilter }}
                    />
                    {/* Number Badge */}
                    <circle cx={badgeX} cy={badgeY} r="3" fill="#05060A" stroke="#00E5FF" strokeWidth="1" />
                    <text
                      x={badgeX}
                      y={badgeY + 1}
                      fill="#00E5FF"
                      fontSize="2.5"
                      fontFamily="var(--font-palatino)"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {reg.id}
                    </text>
                  </g>
                )
              })}
          </svg>

          {/* Compare Split Vertical Line */}
          {compareSplit < 100 && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none w-[2px] bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]"
              style={{ left: `${compareSplit}%` }}
            />
          )}
        </div>
      </div>

      {/* Bottom Adjustment Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t border-white/10 bg-white/[0.02] text-xs font-mono text-[#8B93A7]">
        {/* Opacity Slider */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <Layers className="h-3.5 w-3.5 text-[#00E5FF]" />
          <span>Opacity: {Math.round(opacity * 100)}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="flex-1 accent-[#00E5FF] h-1 rounded bg-white/10"
          />
        </div>

        {/* Sensitivity Slider */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <Sliders className="h-3.5 w-3.5 text-[#8B5CF6]" />
          <span>Sensitivity: {sensitivity}%</span>
          <input
            type="range"
            min="10"
            max="90"
            value={sensitivity}
            onChange={(e) => {
              const val = Number(e.target.value)
              setSensitivity(val)
              onSensitivityChange?.(val)
            }}
            className="flex-1 accent-[#8B5CF6] h-1 rounded bg-white/10"
          />
        </div>

        {/* Compare Split Slider */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <SplitSquareVertical className="h-3.5 w-3.5 text-white/50" />
          <span>Compare Split: {compareSplit}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={compareSplit}
            onChange={(e) => setCompareSplit(Number(e.target.value))}
            className="flex-1 accent-white h-1 rounded bg-white/10"
          />
        </div>
      </div>
    </div>
  )
}
