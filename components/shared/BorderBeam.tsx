"use client"

import React, { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "@/hooks/useReducedMotion"

export interface BorderBeamProps {
  /** Length of the glowing beam head/trail in pixels (default: 120) */
  size?: number
  /** Duration of one full orbit in seconds (default: 7) */
  duration?: number
  /** Animation delay in seconds so multiple panels stay out of sync */
  delay?: number
  /** Reverse travel direction */
  reverse?: boolean
  /** Opacity/intensity multiplier 0..1 (default: 0.6) */
  intensity?: number
  /** Trail start color (default: #BFF6FF) */
  colorFrom?: string
  /** Beam head color (default: #00E5FF) */
  colorTo?: string
  /** Border radius in px or CSS value (default: inherit) */
  radius?: number | string
  /** Class name for the outer wrapper */
  className?: string
  /** Enable subtle 3D tilt on pointer hover (max 3-4 deg) */
  enableTilt?: boolean
}

export default function BorderBeam({
  size = 120,
  duration = 7,
  delay = 0,
  reverse = false,
  intensity = 0.6,
  colorFrom = "#BFF6FF",
  colorTo = "#00E5FF",
  radius = "inherit",
  className = "",
  enableTilt = false,
}: BorderBeamProps) {
  const reducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isTabVisible, setIsTabVisible] = useState(true)

  // Pause beam when off-screen or tab is hidden
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.05 }
    )
    observer.observe(el)

    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState !== "hidden")
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  // Optional 3D tilt on parent panel toward cursor (max 3-4 degrees)
  useEffect(() => {
    if (!enableTilt || reducedMotion) return
    const parent = containerRef.current?.parentElement
    if (!parent) return

    let currentRx = 0
    let currentRy = 0
    let targetRx = 0
    let targetRy = 0
    let rafId: number

    const updateSpring = () => {
      // Spring interpolation
      currentRx += (targetRx - currentRx) * 0.1
      currentRy += (targetRy - currentRy) * 0.1
      parent.style.transform = `perspective(1000px) rotateX(${currentRx.toFixed(2)}deg) rotateY(${currentRy.toFixed(2)}deg)`
      if (Math.abs(targetRx - currentRx) > 0.01 || Math.abs(targetRy - currentRy) > 0.01) {
        rafId = requestAnimationFrame(updateSpring)
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      targetRx = -(y / (rect.height / 2)) * 3.5
      targetRy = (x / (rect.width / 2)) * 3.5
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateSpring)
    }

    const onMouseLeave = () => {
      targetRx = 0
      targetRy = 0
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateSpring)
    }

    parent.addEventListener("mousemove", onMouseMove)
    parent.addEventListener("mouseleave", onMouseLeave)

    return () => {
      cancelAnimationFrame(rafId)
      parent.removeEventListener("mousemove", onMouseMove)
      parent.removeEventListener("mouseleave", onMouseLeave)
      parent.style.transform = ""
    }
  }, [enableTilt, reducedMotion])

  const shouldAnimate = !reducedMotion && isVisible && isTabVisible
  const radiusVal = typeof radius === "number" ? `${radius}px` : radius

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-10 overflow-hidden ${className}`}
      style={{
        borderRadius: radiusVal,
      }}
    >
      {/* 1px Static Faint Border & Top Subtle Highlight */}
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.10)",
        }}
      />

      {/* Travelling Beam Layer */}
      {shouldAnimate && (
        <>
          {/* Soft Blur Glow Behind Beam */}
          <div
            className="border-beam-glow absolute inset-0 rounded-[inherit]"
            style={
              {
                filter: "blur(6px)",
                opacity: (intensity * 0.4).toFixed(3),
                padding: "1.5px",
                "--beam-size": `${size}px`,
                "--beam-duration": `${duration}s`,
                "--beam-delay": `${delay}s`,
                "--beam-direction": reverse ? "reverse" : "normal",
                "--beam-from": colorFrom,
                "--beam-to": colorTo,
                "--beam-radius": radiusVal,
              } as React.CSSProperties
            }
          >
            <div className="border-beam-runner" />
          </div>

          {/* Sharp Perimeter Beam */}
          <div
            className="border-beam-core absolute inset-0 rounded-[inherit]"
            style={
              {
                opacity: intensity.toFixed(3),
                padding: "1.5px",
                "--beam-size": `${size}px`,
                "--beam-duration": `${duration}s`,
                "--beam-delay": `${delay}s`,
                "--beam-direction": reverse ? "reverse" : "normal",
                "--beam-from": colorFrom,
                "--beam-to": colorTo,
                "--beam-radius": radiusVal,
              } as React.CSSProperties
            }
          >
            <div className="border-beam-runner" />
          </div>
        </>
      )}
    </div>
  )
}
