"use client"
import { useEffect, useState, useRef } from "react"
import GlitchWordmark from "./GlitchWordmark"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { useBackgroundState } from "@/lib/context/BackgroundContext"
import { en } from "@/lib/i18n/en"

interface LoadingScreenProps {
  onComplete: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const reducedMotion = useReducedMotion()
  const { isShaderReady } = useBackgroundState()
  const [progress, setProgress] = useState<number>(0)
  const [statusIndex, setStatusIndex] = useState<number>(0)
  const [isExiting, setIsExiting] = useState<boolean>(false)
  const [uptime, setUptime] = useState<string>("00:00:00")
  const [fontsReady, setFontsReady] = useState<boolean>(false)

  const statusMessages = en.intro.statusMessages
  const startTimeRef = useRef<number | null>(null)

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  // Live mono clock / uptime
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, "0")
      const mm = String(now.getMinutes()).padStart(2, "0")
      const ss = String(now.getSeconds()).padStart(2, "0")
      setUptime(`${hh}:${mm}:${ss}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Check fonts readiness asynchronously
  useEffect(() => {
    let active = true
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        if (active) setFontsReady(true)
      })
    } else {
      const timer = setTimeout(() => {
        if (active) setFontsReady(true)
      }, 0)
      return () => {
        active = false
        clearTimeout(timer)
      }
    }
    return () => {
      active = false
    }
  }, [])

  // Status message rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIndex((prev) => {
        if (prev < statusMessages.length - 1) return prev + 1
        return prev
      })
    }, 700)
    return () => clearInterval(timer)
  }, [statusMessages.length])

  // Progress logic
  useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now()
    }

    const minDuration = reducedMotion ? 600 : 2600
    const maxDuration = 5000

    let animationFrameId: number

    const tick = () => {
      const startTime = startTimeRef.current ?? performance.now()
      const elapsed = performance.now() - startTime
      let targetProgress = Math.min(100, (elapsed / minDuration) * 90)

      if (isShaderReady && fontsReady && elapsed >= minDuration) {
        targetProgress = 100
      }

      if (elapsed >= maxDuration) {
        targetProgress = 100
      }

      setProgress((prev) => {
        const next = prev + (targetProgress - prev) * 0.12
        if (targetProgress === 100 && next >= 99.4) {
          return 100
        }
        return next
      })

      if (targetProgress === 100 && progress >= 99.4) {
        setProgress(100)
        setStatusIndex(statusMessages.length - 1)
        setTimeout(() => {
          setIsExiting(true)
          setTimeout(
            () => {
              onComplete()
            },
            reducedMotion ? 400 : 1100
          )
        }, 250)
      } else {
        animationFrameId = requestAnimationFrame(tick)
      }
    }

    animationFrameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isShaderReady, fontsReady, progress, reducedMotion, onComplete, statusMessages.length])

  const formattedPercent = String(Math.floor(progress)).padStart(3, "0")

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(progress)}
      aria-label="Loading TRACE"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all ${
        isExiting
          ? reducedMotion
            ? "opacity-0 duration-400"
            : "pointer-events-none duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
          : "opacity-100"
      }`}
      style={
        isExiting && !reducedMotion
          ? {
              clipPath: "circle(0% at 50% 50%)",
            }
          : {
              clipPath: "circle(150% at 50% 50%)",
            }
      }
    >

      {/* Radial vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 30%, #05060A 85%)",
        }}
      />

      {/* Scanline + Grain Overlay */}
      <div className="scanlines-overlay pointer-events-none absolute inset-0" />
      <div className="film-grain" />

      {/* Corner HUD details */}
      <div className="pointer-events-none absolute top-6 left-6 font-mono text-[11px] tracking-[0.18em] text-white/50 uppercase">
        {en.intro.hudVersion}
      </div>

      <div className="pointer-events-none absolute top-6 right-6 font-mono text-[11px] tracking-[0.18em] text-white/50 uppercase tabular-nums">
        SYS_TIME: {uptime}
      </div>

      <div className="pointer-events-none absolute bottom-6 left-6 font-mono text-[11px] tracking-[0.18em] text-white/50 uppercase">
        {en.intro.hudCategory}
      </div>

      <div className="pointer-events-none absolute right-6 bottom-6 font-mono text-[11px] tracking-[0.18em] text-white/50 uppercase tabular-nums">
        {formattedPercent}%
      </div>

      {/* Center Content */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center px-4 transition-all duration-500 ${
          isExiting ? "scale-110 blur-md opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <GlitchWordmark />

        {/* Status Line */}
        <div className="mt-8 h-6 overflow-hidden">
          <p
            key={statusIndex}
            className="animate-fade-in font-mono text-xs tracking-[0.18em] text-[#00E5FF] uppercase transition-all duration-300"
          >
            {statusMessages[statusIndex]}
          </p>
        </div>

        {/* Progress Line */}
        <div className="mt-4 h-[1px] w-64 overflow-hidden rounded-full bg-white/10 sm:w-80">
          <div
            className="h-full bg-gradient-to-r from-[#00E5FF] to-[#8B5CF6] transition-all duration-100"
            style={{
              width: `${progress}%`,
              boxShadow: "0 0 10px #00E5FF",
            }}
          />
        </div>
      </div>
    </div>
  )
}
