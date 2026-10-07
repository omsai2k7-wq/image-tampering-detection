"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import ShaderDemo_ATC from "@/components/ui/atc-shader"
import { useBackgroundState } from "@/lib/context/BackgroundContext"

export default function ShaderBackground() {
  const { phase, verdict, isAdriaOpen, setShaderReady } = useBackgroundState()

  const [scrollProgress, setScrollProgress] = useState(0)
  const [effectiveSpeed, setEffectiveSpeed] = useState(1)

  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(0)
  const velocityBoostRef = useRef(0)
  const rafId = useRef<number | 0>(0)

  // Base speed determination
  const baseSpeed = phase === "processing" ? 1.4 : 1.0

  // Scroll listener & spring velocity animation
  useEffect(() => {
    lastScrollTime.current = performance.now()
    if (typeof window !== "undefined") {
      lastScrollY.current = window.scrollY
    }

    const handleScroll = () => {
      const now = performance.now()
      const currentY = window.scrollY
      const dt = Math.max(16, now - lastScrollTime.current)
      const dy = Math.abs(currentY - lastScrollY.current)

      // Velocity in pixels/sec
      const velocity = (dy / dt) * 1000
      // Map velocity up to ~0.8 boost (capped so base 1.0 reaches ~1.8)
      const boost = Math.min(0.8, velocity / 1800)
      velocityBoostRef.current = Math.max(velocityBoostRef.current, boost)

      lastScrollY.current = currentY
      lastScrollTime.current = now

      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0) {
        setScrollProgress(Math.min(1, Math.max(0, currentY / docHeight)))
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    // Spring decay loop to ease back to base speed
    const tick = () => {
      // Ease boost back to 0 with spring damping
      velocityBoostRef.current += (0 - velocityBoostRef.current) * 0.08
      if (Math.abs(velocityBoostRef.current) < 0.005) {
        velocityBoostRef.current = 0
      }

      const calculatedSpeed = Math.min(1.8, baseSpeed + velocityBoostRef.current)
      setEffectiveSpeed(Number(calculatedSpeed.toFixed(3)))

      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [baseSpeed])

  // Verdict-based soft tint computation (12% - 18% opacity)
  const verdictTint = useMemo(() => {
    if (phase !== "result" || !verdict) return { color: "transparent", opacity: 0 }
    switch (verdict) {
      case "likely_authentic":
        return { color: "rgba(44, 255, 167, 0.14)", opacity: 1 } // green
      case "suspicious":
        return { color: "rgba(255, 176, 32, 0.14)", opacity: 1 } // amber
      case "likely_manipulated":
        return { color: "rgba(255, 46, 77, 0.15)", opacity: 1 } // red
      default:
        return { color: "transparent", opacity: 0 }
    }
  }, [phase, verdict])

  // Gradient midpoint shift with scroll (subtle 40% - 60% range)
  const gradientMidpoint = 50 + (scrollProgress - 0.5) * 20

  // Processing mode darkens the gradient for higher contrast
  const topOpacity = phase === "processing" ? 0.80 : 0.70
  const midOpacity = phase === "processing" ? 0.68 : 0.55
  const bottomOpacity = phase === "processing" ? 0.80 : 0.70

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{
        zIndex: -1,
      }}
      aria-hidden="true"
    >
      {/* 1. Canvas: Single WebGL2 ATC Shader */}
      <div className="absolute inset-0">
        <ShaderDemo_ATC
          speed={effectiveSpeed}
          onReady={() => setShaderReady(true)}
        />
      </div>

      {/* 2. Fixed Overlay Stack (above canvas, below content) */}

      {/* (a) Dark gradient: #05060A at 55-70% opacity, stronger at top & bottom, alive with scroll */}
      <div
        className="absolute inset-0 transition-all duration-600 ease-out"
        style={{
          background: `linear-gradient(to bottom, rgba(5,6,10,${topOpacity}) 0%, rgba(5,6,10,${midOpacity}) ${gradientMidpoint}%, rgba(5,6,10,${bottomOpacity}) 100%)`,
        }}
      />

      {/* (a.1) Soft phase verdict tint (smooth 600 ms transition) */}
      <div
        className="absolute inset-0 transition-all duration-600 ease-out"
        style={{
          backgroundColor: verdictTint.color,
          opacity: verdictTint.opacity,
        }}
      />

      {/* (a.2) Faint cyan pulse during processing stage */}
      {phase === "processing" && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            backgroundColor: "rgba(0, 229, 255, 0.08)",
            animationDuration: "2.4s",
          }}
        />
      )}

      {/* (a.3) ADRIA panel open: dim the background for focus (smooth 600 ms) */}
      <div
        className="absolute inset-0 transition-opacity duration-600 ease-out"
        style={{
          backgroundColor: "#05060A",
          opacity: isAdriaOpen ? 0.28 : 0,
        }}
      />

      {/* (b) Subtle radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(5, 6, 10, 0.75) 100%)",
        }}
      />

      {/* (c) Film grain overlay */}
      <div className="film-grain" />
    </div>
  )
}
