"use client"

import React, { useRef, useState } from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { cn } from "@/lib/utils"

interface MagneticButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode
  className?: string
  conicBorder?: boolean
  onClick?: () => void
}

export default function MagneticButton({
  children,
  className,
  conicBorder = false,
  onClick,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const reducedMotion = useReducedMotion()

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reducedMotion || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = (e.clientX - centerX) * 0.25
    const deltaY = (e.clientY - centerY) * 0.25

    // Clamp to max 12px
    const clampedX = Math.max(-12, Math.min(12, deltaX))
    const clampedY = Math.max(-12, Math.min(12, deltaY))

    setPosition({ x: clampedX, y: clampedY })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.button
      ref={ref}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center justify-center rounded-full font-medium transition-all duration-300 outline-none select-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060A]",
        conicBorder && "p-[1px]",
        className
      )}
      {...props}
    >
      {conicBorder && (
        <span
          className="conic-border-pulse absolute inset-0 -z-10 rounded-full opacity-70 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
      <span className="relative flex h-full w-full items-center justify-center rounded-full">
        {children}
      </span>
    </motion.button>
  )
}
