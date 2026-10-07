"use client"

import { useEffect, useState, useRef } from "react"
import { useReducedMotion } from "@/hooks/useReducedMotion"

const TARGET_WORD = "TRACE"
const GLYPHS = "▓▒░#@%&01"

interface GlitchWordmarkProps {
  onComplete?: () => void
}

export default function GlitchWordmark({ onComplete }: GlitchWordmarkProps) {
  const reducedMotion = useReducedMotion()
  const [letters, setLetters] = useState<string[]>(() =>
    TARGET_WORD.split("").map(() => GLYPHS[Math.floor(Math.random() * GLYPHS.length)])
  )
  const [locked, setLocked] = useState<boolean[]>([false, false, false, false, false])
  const [isSliceGlitching, setIsSliceGlitching] = useState<boolean>(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (reducedMotion) {
      const timer = setTimeout(() => {
        onCompleteRef.current?.()
      }, 600)
      return () => clearTimeout(timer)
    }

    let resolvedIndex = 0
    const startTime = performance.now()

    const interval = setInterval(() => {
      const now = performance.now()
      const elapsed = now - startTime

      // Step lock every 160ms
      const targetResolved = Math.min(TARGET_WORD.length, Math.floor(elapsed / 160))

      setLetters((prev) =>
        prev.map((l, i) => {
          if (i < targetResolved) {
            return TARGET_WORD[i]
          }
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        })
      )

      setLocked((prev) => prev.map((_, i) => i < targetResolved))

      if (targetResolved >= TARGET_WORD.length && resolvedIndex < TARGET_WORD.length) {
        resolvedIndex = TARGET_WORD.length
        clearInterval(interval)

        // Trigger slice glitch for 180ms
        setIsSliceGlitching(true)
        setTimeout(() => {
          setIsSliceGlitching(false)
          onCompleteRef.current?.()
        }, 180)
      }
    }, 45)

    return () => clearInterval(interval)
  }, [reducedMotion])

  const displayedLetters = reducedMotion ? TARGET_WORD.split("") : letters

  return (
    <div
      className="relative select-none font-normal italic tracking-tight text-white transition-all duration-300"
      style={{
        fontSize: "clamp(3.5rem, 15vw, 13rem)",
        lineHeight: 1.05,
        fontFamily: "var(--font-palatino)",
        letterSpacing: "-0.03em",
      }}
    >
      <div
        className={`flex items-center justify-center transition-transform ${
          isSliceGlitching ? "translate-x-1 skew-x-2" : ""
        }`}
        style={
          isSliceGlitching
            ? {
                clipPath:
                  "polygon(0 15%, 100% 15%, 100% 38%, 0 38%, 0 60%, 100% 60%, 100% 85%, 0 85%)",
              }
            : undefined
        }
      >
        {TARGET_WORD.split("").map((_, i) => {
          const isLock = reducedMotion || locked[i]
          return (
            <span
              key={i}
              className="inline-block transition-all duration-150"
              style={{
                textShadow: isLock
                  ? "0 0 24px rgba(0, 229, 255, 0.4), 0 0 48px rgba(139, 92, 246, 0.2)"
                  : "-4px 0 #00E5FF, 4px 0 #FF2E4D",
                filter: isLock ? "none" : "blur(1px)",
                opacity: isLock ? 1 : 0.85,
              }}
            >
              {displayedLetters[i]}
            </span>
          )
        })}
      </div>
    </div>
  )
}
