"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import AdriaOrb, { OrbStatus } from "./AdriaOrb"

interface AdriaLauncherProps {
  isOpen: boolean
  onToggle: () => void
  status?: OrbStatus
}

export default function AdriaLauncher({
  isOpen,
  onToggle,
  status = "idle",
}: AdriaLauncherProps) {
  const [isHovered, setIsHovered] = useState(false)

  if (isOpen) return null

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3"
    >
      {/* Small mono label on hover */}
      {isHovered && (
        <motion.span
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel px-3 py-1 font-mono text-[11px] font-bold tracking-widest text-[#00E5FF] uppercase shadow-lg"
        >
          ADRIA // ASSISTANT
        </motion.span>
      )}

      {/* Floating Interactive Orb Launcher */}
      <button
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-cursor="talk"
        aria-label="Open ADRIA AI Safety and Forensic Assistant"
        className="relative group p-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060A]"
      >
        <AdriaOrb status={status} size={58} />
      </button>
    </motion.div>
  )
}
