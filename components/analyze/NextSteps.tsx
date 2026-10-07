"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { en } from "@/lib/i18n/en"
import { ChevronDown, ShieldAlert, PhoneCall, Globe, Users, HeartHandshake } from "lucide-react"

const stepIcons = [ShieldAlert, Globe, ShieldAlert, PhoneCall, HeartHandshake]

/**
 * Format descriptions to turn helplines and websites into real clickable, tappable links
 */
function renderLinkedDescription(text: string) {
  // Split on known tokens
  const tokenRegex = /(cybercrime\.gov\.in|StopNCII\.org|1930|1098|14416|112)/gi
  const parts = text.split(tokenRegex)

  return parts.map((part, i) => {
    const lower = part.toLowerCase()
    if (lower === "1930" || lower === "1098" || lower === "14416" || lower === "112") {
      return (
        <a
          key={i}
          href={`tel:${part}`}
          className="font-bold text-[#00E5FF] underline decoration-[#00E5FF]/40 underline-offset-4 hover:decoration-[#00E5FF] hover:text-white transition-colors"
        >
          {part}
        </a>
      )
    }
    if (lower === "cybercrime.gov.in") {
      return (
        <a
          key={i}
          href="https://cybercrime.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#00E5FF] underline decoration-[#00E5FF]/40 underline-offset-4 hover:decoration-[#00E5FF] hover:text-white transition-colors"
        >
          {part}
        </a>
      )
    }
    if (lower === "stopncii.org") {
      return (
        <a
          key={i}
          href="https://stopncii.org"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#00E5FF] underline decoration-[#00E5FF]/40 underline-offset-4 hover:decoration-[#00E5FF] hover:text-white transition-colors"
        >
          {part}
        </a>
      )
    }
    return part
  })
}

export default function NextSteps() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const strings = en.analyze.nextSteps

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <div className="w-full glass-panel p-6 md:p-8 mt-12 border border-white/10">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
        <Users className="h-5 w-5 text-[#00E5FF]" />
        <h3 className="text-xl font-bold text-white tracking-tight">
          {strings.title}
        </h3>
      </div>

      <div className="space-y-3">
        {strings.items.map((item, idx) => {
          const isOpen = openIndex === idx
          const Icon = stepIcons[idx] || ShieldAlert
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-colors hover:border-white/10"
            >
              <button
                onClick={() => toggleAccordion(idx)}
                className="w-full p-4 md:p-5 flex items-center justify-between text-left font-medium text-white gap-4"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-[#00E5FF]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-base">{item.title}</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-[#8B93A7] transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-white" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 pb-5 text-sm md:text-base text-[#8B93A7] leading-relaxed border-t border-white/5 pt-3"
                >
                  {renderLinkedDescription(item.description)}
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      {/* Verification footnote */}
      <p className="mt-6 text-xs text-[#8B93A7] font-mono tracking-wide text-center">
        * {strings.note}
      </p>
    </div>
  )
}
