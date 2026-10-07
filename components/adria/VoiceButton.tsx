"use client"

import { motion } from "framer-motion"
import { Mic, MicOff } from "lucide-react"

interface VoiceButtonProps {
  supported: boolean
  listening: boolean
  onToggle: () => void
  disabled?: boolean
}

export default function VoiceButton({
  supported,
  listening,
  onToggle,
  disabled = false,
}: VoiceButtonProps) {
  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input isn't supported in this browser. Try Chrome or Edge."
        className="p-2.5 rounded-full text-white/30 cursor-not-allowed transition-colors"
        aria-label="Voice input not supported"
      >
        <MicOff className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={listening ? "Tap to stop listening" : "Tap to speak (English & regional)"}
      className={`relative p-2.5 rounded-full transition-all duration-300 outline-none select-none ${
        listening
          ? "bg-[#00E5FF] text-black shadow-[0_0_20px_#00E5FF]"
          : "bg-white/5 text-[#8B93A7] hover:text-white hover:bg-white/10"
      }`}
      aria-label={listening ? "Stop listening" : "Start voice input"}
    >
      {listening ? (
        <div className="flex items-center gap-0.5 h-4 px-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ height: ["4px", "14px", "4px"] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
              className="w-1 bg-black rounded-full"
            />
          ))}
        </div>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  )
}
