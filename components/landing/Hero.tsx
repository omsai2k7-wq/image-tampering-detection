"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import MagneticButton from "@/components/shared/MagneticButton"
import GlitchFace from "./GlitchFace"
import { en } from "@/lib/i18n/en"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { ShieldCheck, Lock, Scale, ArrowDown } from "lucide-react"

export default function Hero() {
  const reducedMotion = useReducedMotion()
  const [isGlitchingTrace, setIsGlitchingTrace] = useState(false)

  useEffect(() => {
    if (reducedMotion) return

    const interval = setInterval(() => {
      setIsGlitchingTrace(true)
      setTimeout(() => setIsGlitchingTrace(false), 240)
    }, 6000)

    return () => clearInterval(interval)
  }, [reducedMotion])

  const scrollToAnalyze = () => {
    document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth" })
  }

  const scrollToHow = () => {
    document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center px-6 pt-32 pb-20 md:px-12 md:pt-40 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Copy & Actions */}
        <div className="lg:col-span-7 flex flex-col items-start z-10">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/5 px-3.5 py-1 text-[11px] font-mono tracking-[0.18em] text-[#00E5FF] uppercase mb-6"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
            {en.hero.eyebrow}
          </motion.div>

          {/* Headline with word-mask reveal */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] mb-6">
            <span className="inline-block overflow-hidden align-top">
              <motion.span
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block"
              >
                Every edit
              </motion.span>
            </span>{" "}
            <span className="inline-block overflow-hidden align-top">
              <motion.span
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block"
              >
                leaves a
              </motion.span>
            </span>{" "}
            <span className="inline-block overflow-hidden align-top">
              <motion.span
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`inline-block transition-all duration-150 ${
                  isGlitchingTrace ? "skew-x-3" : ""
                }`}
                style={{
                  color: "#00E5FF",
                  textShadow: isGlitchingTrace
                    ? "-5px 0 #FF2E4D, 5px 0 #8B5CF6"
                    : "0 0 24px rgba(0, 229, 255, 0.4)",
                }}
              >
                trace.
              </motion.span>
            </span>
          </h1>

          {/* Sub-copy */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-lg md:text-xl text-[#8B93A7] max-w-xl leading-relaxed mb-10"
          >
            {en.hero.subCopy}
          </motion.p>

          {/* Primary & Secondary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-wrap items-center gap-4 mb-12"
          >
            <MagneticButton
              conicBorder
              onClick={scrollToAnalyze}
              className="bg-white px-8 py-4 text-sm font-semibold text-black tracking-wide hover:shadow-[0_0_30px_rgba(0,229,255,0.4)]"
            >
              {en.hero.ctaPrimary}
            </MagneticButton>

            <button
              onClick={scrollToHow}
              className="px-6 py-4 rounded-full text-sm font-medium text-[#8B93A7] hover:text-white transition-colors duration-200"
            >
              {en.hero.ctaSecondary}
            </button>
          </motion.div>

          {/* Trust Chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap items-center gap-3"
          >
            <div className="glass-panel inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs text-[#E9ECF5]/80 font-mono tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-[#00E5FF]" />
              {en.hero.trustChips[0]}
            </div>
            <div className="glass-panel inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs text-[#E9ECF5]/80 font-mono tracking-wider">
              <Lock className="h-3.5 w-3.5 text-[#8B5CF6]" />
              {en.hero.trustChips[1]}
            </div>
            <div className="glass-panel inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs text-[#E9ECF5]/80 font-mono tracking-wider">
              <Scale className="h-3.5 w-3.5 text-[#2CFFA7]" />
              {en.hero.trustChips[2]}
            </div>
          </motion.div>
        </div>

        {/* Right Column: GlitchFace */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <GlitchFace />
        </div>
      </div>

      {/* Scroll Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="mt-16 flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-[#8B93A7] uppercase"
      >
        <span>{en.hero.scrollHint}</span>
        <div className="h-[1px] w-12 bg-gradient-to-r from-[#00E5FF] to-transparent animate-pulse" />
        <ArrowDown className="h-3 w-3 text-[#00E5FF] animate-bounce" />
      </motion.div>
    </section>
  )
}
