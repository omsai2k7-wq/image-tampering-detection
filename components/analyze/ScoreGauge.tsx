"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Label } from "@/lib/detection/types"
import { useReducedMotion } from "@/hooks/useReducedMotion"

interface ScoreGaugeProps {
  score: number // 0..1
  label: Label
}

export default function ScoreGauge({ score, label }: ScoreGaugeProps) {
  const reducedMotion = useReducedMotion()
  const targetScorePercent = Math.round(score * 100)
  const [displayScore, setDisplayScore] = useState<number>(0)

  // Verdict colour mapping
  const colorMap: Record<Label, { stroke: string; glow: string; text: string }> = {
    likely_authentic: {
      stroke: "#2CFFA7",
      glow: "rgba(44, 255, 167, 0.4)",
      text: "text-[#2CFFA7]",
    },
    suspicious: {
      stroke: "#FFB020",
      glow: "rgba(255, 176, 32, 0.4)",
      text: "text-[#FFB020]",
    },
    likely_manipulated: {
      stroke: "#FF2E4D",
      glow: "rgba(255, 46, 77, 0.4)",
      text: "text-[#FF2E4D]",
    },
  }

  const { stroke, glow, text } = colorMap[label]

  // Count up animation
  useEffect(() => {
    if (reducedMotion) return

    const start = performance.now()
    const duration = 1800 // 1.8s count up
    let rafId: number

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / duration)
      // expoOut easing
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplayScore(Math.round(targetScorePercent * ease))

      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [targetScorePercent, reducedMotion])

  const displayValue = reducedMotion ? targetScorePercent : displayScore

  // Radial SVG calculations
  const size = 180
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (targetScorePercent / 100) * circumference

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      role="meter"
      aria-valuenow={targetScorePercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Manipulation likelihood ${targetScorePercent} percent, ${label.replace("_", " ")}`}
    >
      <svg
        width={size}
        height={size}
        className="rotate-[-90deg] overflow-visible"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated verdict arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: reducedMotion ? 0.3 : 1.8,
            ease: [0.16, 1, 0.3, 1],
          }}
          strokeLinecap="round"
          fill="none"
          style={{
            filter: `drop-shadow(0 0 12px ${glow})`,
          }}
        />
      </svg>

      {/* Center Number & Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`text-4xl md:text-5xl font-normal italic tracking-tight tabular-nums ${text}`}
          style={{ fontFamily: "var(--font-palatino)" }}
        >
          {displayValue}%
        </span>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/50 mt-1">
          Likelihood
        </span>
      </div>
    </div>
  )
}
