"use client"

import { en } from "@/lib/i18n/en"
import { ArrowUp, Lock } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const strings = en.footer
  const isMlServiceEnabled = process.env.NEXT_PUBLIC_FORENSICS_SERVICE_ENABLED === "true"
  const privacyText = isMlServiceEnabled
    ? "Advanced localisation sends your image to our analysis server; it is processed and not stored."
    : strings.privacyLine

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const scrollToHow = () => {
    document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <footer className="relative border-t border-white/10 bg-transparent py-16 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left: Brand & Privacy note */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="text-2xl font-bold italic tracking-tight text-white"
              style={{ fontFamily: "var(--font-palatino)" }}
            >
              {strings.wordmark}
            </span>
            <span className="font-mono text-xs text-white/40">
              © {currentYear} TRACE
            </span>
          </div>

          <p className="text-xs text-[#8B93A7] flex items-center gap-1.5 max-w-md">
            <Lock className="h-3 w-3 text-[#00E5FF] shrink-0" />
            {privacyText}
          </p>
        </div>

        {/* Right: Links & Back to top */}
        <div className="flex items-center gap-6 font-mono text-xs text-[#8B93A7]">
          <button
            onClick={() => {
              alert(
                "TRACE Privacy Policy:\n\n1. No image persistence: Images uploaded for analysis are held exclusively in volatile RAM during inspection and immediately purged.\n2. Zero telemetry on uploaded media.\n3. Third-party provider adapters operate under strict no-storage data policies.\n4. Advanced localisation, when active, processes data statelessly on an ephemeral analysis server."
              )
            }}
            className="hover:text-white transition-colors"
          >
            {strings.privacyNote}
          </button>

          <button
            onClick={scrollToHow}
            className="hover:text-white transition-colors"
          >
            {strings.limitations}
          </button>

          <button
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 text-[#00E5FF] hover:text-white transition-colors"
          >
            <span>{strings.backToTop}</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  )
}
