"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/hooks/useReducedMotion"

export type OrbStatus = "idle" | "listening" | "thinking" | "speaking"

interface AdriaOrbProps {
  status: OrbStatus
  size?: number
}

export default function AdriaOrb({ status = "idle", size = 56 }: AdriaOrbProps) {
  const reducedMotion = useReducedMotion()

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Outer Glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl transition-all duration-500 opacity-60"
        style={{
          background:
            status === "listening"
              ? "radial-gradient(circle, #00E5FF 0%, transparent 70%)"
              : status === "thinking"
              ? "radial-gradient(circle, #8B5CF6 0%, transparent 70%)"
              : status === "speaking"
              ? "radial-gradient(circle, #00E5FF 0%, #8B5CF6 50%, transparent 70%)"
              : "radial-gradient(circle, #00E5FF 0%, #8B5CF6 60%, transparent 70%)",
        }}
      />

      {/* Ripple Rings for Speaking / Listening */}
      {(status === "speaking" || status === "listening") && !reducedMotion && (
        <motion.div
          animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border border-[#00E5FF]/60"
        />
      )}

      {/* Orbiting Dots for Thinking */}
      {status === "thinking" && !reducedMotion && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <span className="absolute top-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#00E5FF]" />
          <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#8B5CF6]" />
        </motion.div>
      )}

      {/* Core Orb Blob */}
      <motion.div
        animate={
          reducedMotion
            ? {}
            : status === "idle"
            ? { scale: [1, 1.05, 1], rotate: [0, 90, 0] }
            : status === "listening"
            ? { scale: [1, 1.15, 0.95, 1.1] }
            : status === "thinking"
            ? { rotate: 360, scale: [1, 0.95, 1] }
            : { scale: [1, 1.12, 1] }
        }
        transition={{
          duration: status === "idle" ? 4 : status === "thinking" ? 3 : 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative h-4/5 w-4/5 rounded-full overflow-hidden shadow-[inset_0_0_12px_rgba(255,255,255,0.4)]"
        style={{
          background:
            "linear-gradient(135deg, #00E5FF 0%, #8B5CF6 60%, #05060A 100%)",
        }}
      >
        {/* Inner specular highlight */}
        <div className="absolute top-1 left-2 h-2 w-3 rounded-full bg-white/40 blur-[1px]" />
      </motion.div>
    </div>
  )
}
