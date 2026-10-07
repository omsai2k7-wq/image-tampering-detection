"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import BorderBeam from "@/components/shared/BorderBeam"
import { en } from "@/lib/i18n/en"
import { X, Shield } from "lucide-react"

interface ProcessingStageProps {
  previewUrl: string
  onCancel: () => void
}

export default function ProcessingStage({ previewUrl, onCancel }: ProcessingStageProps) {
  const [statusIndex, setStatusIndex] = useState(0)
  const strings = en.analyze.processing

  // Rotate neutral status messages every 1.2s
  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % strings.statusRotations.length)
    }, 1200)
    return () => clearInterval(timer)
  }, [strings.statusRotations.length])

  return (
    <div className="w-full max-w-3xl mx-auto glass-panel p-6 md:p-10 flex flex-col items-center relative overflow-hidden">
      {/* 3s High Intensity Border Beam */}
      <BorderBeam duration={3} intensity={0.9} size={140} colorTo="#00E5FF" colorFrom="#BFF6FF" />

      {/* Screen reader announcement: only announced once */}
      <div aria-live="polite" className="sr-only">
        {strings.ariaLive}
      </div>

      {/* Top Engine Header */}
      <div className="w-full flex items-center justify-between pb-4 mb-6 border-b border-white/10 font-mono text-xs text-white/50">
        <div className="flex items-center gap-2 text-[#00E5FF]">
          <Shield className="h-4 w-4 animate-pulse" />
          <span>NEURAL_INSPECTOR // ACTIVE</span>
        </div>
        <span className="tabular-nums uppercase tracking-widest text-[#8B5CF6]">
          STAGE 02/03
        </span>
      </div>

      {/* Central Scanning Viewport with tightened corner brackets */}
      <div className="relative max-h-[50vh] max-w-full rounded-2xl overflow-hidden bg-black/60 p-2 mb-8 border border-white/10 flex items-center justify-center">
        {/* Animated Corner Brackets */}
        <motion.div
          animate={{ scale: [1.06, 1, 1.06] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-1 pointer-events-none z-20"
        >
          {/* Top Left */}
          <span className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-[#00E5FF]" />
          {/* Top Right */}
          <span className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-[#00E5FF]" />
          {/* Bottom Left */}
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[#00E5FF]" />
          {/* Bottom Right */}
          <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[#00E5FF]" />
        </motion.div>

        {/* The User Image */}
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Inspecting uploaded file"
            draggable={false}
            className="max-h-[45vh] max-w-full object-contain rounded-xl opacity-90 filter contrast-105 pointer-events-none"
          />
        )}

        {/* Cyan Sweeping Scanning Beam */}
        <motion.div
          animate={{ top: ["-10%", "110%"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-0 right-0 h-14 pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(0, 229, 255, 0.45) 70%, #00E5FF)",
            boxShadow: "0 0 24px rgba(0, 229, 255, 0.8)",
            mixBlendMode: "screen",
          }}
        />

        {/* Decorative 24x24 Pixel Grid Overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10 grid grid-cols-12 grid-rows-12 gap-1 p-2 opacity-20"
          aria-hidden="true"
        >
          {Array.from({ length: 48 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.1, 0.6, 0.1] }}
              transition={{
                duration: 1 + (i % 5) * 0.4,
                repeat: Infinity,
                delay: (i % 7) * 0.2,
              }}
              className="rounded-[1px] bg-[#00E5FF]/40"
            />
          ))}
        </div>
      </div>

      {/* Rotating Neutral Status Text */}
      <div className="h-7 mb-4 flex items-center justify-center overflow-hidden">
        <motion.p
          key={statusIndex}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.3 }}
          className="font-mono text-sm tracking-[0.18em] text-[#00E5FF] uppercase font-semibold text-center"
        >
          {strings.statusRotations[statusIndex]}
        </motion.p>
      </div>

      {/* Indeterminate Progress Bar (never a fake percentage) */}
      <div className="w-64 sm:w-80 h-1 bg-white/10 rounded-full overflow-hidden relative mb-6">
        <motion.div
          animate={{
            x: ["-100%", "250%"],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-1/3 h-full bg-gradient-to-r from-transparent via-[#00E5FF] to-[#8B5CF6] rounded-full"
          style={{
            boxShadow: "0 0 12px #00E5FF",
          }}
        />
      </div>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-mono text-xs uppercase tracking-wider text-[#8B93A7] hover:text-white hover:bg-white/5 transition-all"
      >
        <X className="h-3.5 w-3.5" />
        {strings.cancelBtn}
      </button>
    </div>
  )
}
