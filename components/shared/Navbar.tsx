"use client"

import { useState } from "react"
import { motion, useScroll, useSpring } from "framer-motion"
import { en } from "@/lib/i18n/en"
import { Menu, X, ShieldAlert } from "lucide-react"

interface NavbarProps {
  visible: boolean
}

export default function Navbar({ visible }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 90,
  })

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  if (!visible) return null

  return (
    <>
      {/* Fixed top scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00E5FF] via-[#8B5CF6] to-[#00E5FF] z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* Main Navigation Bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/[0.03] backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          {/* Brand Wordmark & Demo Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-xl font-bold italic tracking-tight text-white hover:text-[#00E5FF] transition-colors"
              style={{ fontFamily: "var(--font-palatino)" }}
            >
              {en.nav.wordmark}
            </button>

            {isDemoMode && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#FFB020]/30 bg-[#FFB020]/10 px-2 py-0.5 text-[10px] font-mono tracking-widest text-[#FFB020] uppercase font-semibold">
                <ShieldAlert className="h-2.5 w-2.5" />
                {en.nav.demoBadge}
              </span>
            )}
          </div>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <button
              onClick={() => scrollTo("how")}
              className="text-[#8B93A7] hover:text-white transition-colors"
            >
              {en.nav.howItWorks}
            </button>
            <button
              onClick={() => scrollTo("analyze")}
              className="text-[#8B93A7] hover:text-white transition-colors"
            >
              {en.nav.checkImage}
            </button>
            <button
              onClick={() => scrollTo("about")}
              className="text-[#8B93A7] hover:text-white transition-colors"
            >
              {en.nav.about}
            </button>
          </nav>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#8B93A7] hover:text-white p-2"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6 text-white" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/10 bg-[#0B0D14]/95 px-6 py-6 flex flex-col gap-4 text-base"
          >
            <button
              onClick={() => scrollTo("how")}
              className="text-left py-2 text-[#8B93A7] hover:text-white"
            >
              {en.nav.howItWorks}
            </button>
            <button
              onClick={() => scrollTo("analyze")}
              className="text-left py-2 text-[#8B93A7] hover:text-white"
            >
              {en.nav.checkImage}
            </button>
            <button
              onClick={() => scrollTo("about")}
              className="text-left py-2 text-[#8B93A7] hover:text-white"
            >
              {en.nav.about}
            </button>
          </motion.div>
        )}
      </motion.header>
    </>
  )
}
