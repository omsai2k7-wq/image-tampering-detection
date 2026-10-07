"use client"

import { useEffect, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { useReducedMotion } from "@/hooks/useReducedMotion"

export default function CustomCursor() {
  const reducedMotion = useReducedMotion()
  const [isVisible, setIsVisible] = useState(false)
  const [cursorType, setCursorType] = useState<string>("default")
  const [cursorLabel, setCursorLabel] = useState<string>("")

  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  const springConfig = { damping: 28, stiffness: 350 }
  const ringX = useSpring(mouseX, springConfig)
  const ringY = useSpring(mouseY, springConfig)

  useEffect(() => {
    // Only on fine pointers (desktop mouse)
    if (reducedMotion || typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) {
      return
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      if (!isVisible) setIsVisible(true)

      const target = e.target as HTMLElement | null
      if (!target) return

      // Form fields: don't override native interactions
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        setCursorType("input")
        setCursorLabel("")
        return
      }

      const dropzone = target.closest("[data-cursor='drop']")
      const openElem = target.closest("[data-cursor='open']")
      const talkElem = target.closest("[data-cursor='talk']")

      if (dropzone) {
        setCursorType("crosshair")
        setCursorLabel("Drop")
      } else if (openElem) {
        setCursorType("hover")
        setCursorLabel("Open")
      } else if (talkElem) {
        setCursorType("hover")
        setCursorLabel("Talk")
      } else {
        setCursorType("default")
        setCursorLabel("")
      }
    }

    const onMouseLeave = () => setIsVisible(false)

    window.addEventListener("mousemove", onMouseMove, { passive: true })
    document.addEventListener("mouseleave", onMouseLeave)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseleave", onMouseLeave)
    }
  }, [reducedMotion, isVisible, mouseX, mouseY])

  if (reducedMotion || !isVisible || cursorType === "input") return null

  const isCrosshair = cursorType === "crosshair"
  const isHovered = cursorType === "hover" || isCrosshair

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
      {/* Center 8px dot */}
      <motion.div
        className="fixed top-0 left-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]"
        style={{
          x: mouseX,
          y: mouseY,
        }}
      />

      {/* Lagging 36px ring */}
      <motion.div
        className={`fixed top-0 left-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#00E5FF]/40 transition-colors ${
          isHovered ? "bg-[#00E5FF]/10" : ""
        }`}
        animate={{
          width: isHovered ? 48 : 36,
          height: isHovered ? 48 : 36,
          borderColor: isHovered ? "rgba(0, 229, 255, 0.8)" : "rgba(0, 229, 255, 0.3)",
        }}
        transition={{ duration: 0.2 }}
        style={{
          x: ringX,
          y: ringY,
        }}
      >
        {isCrosshair && (
          <div className="relative h-4 w-4">
            <span className="absolute top-1/2 left-0 h-[1px] w-full -translate-y-1/2 bg-[#00E5FF]" />
            <span className="absolute top-0 left-1/2 h-full w-[1px] -translate-x-1/2 bg-[#00E5FF]" />
          </div>
        )}
        {cursorLabel && !isCrosshair && (
          <span className="font-mono text-[9px] font-bold tracking-widest text-[#00E5FF] uppercase">
            {cursorLabel}
          </span>
        )}
      </motion.div>
    </div>
  )
}
