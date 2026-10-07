"use client"

import { useRef } from "react"
import { motion, useScroll, useSpring } from "framer-motion"
import { UploadCloud, Cpu, ShieldCheck, AlertCircle } from "lucide-react"
import { en } from "@/lib/i18n/en"

const icons = [UploadCloud, Cpu, ShieldCheck]

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { headline, steps, limitationsTitle, limitationsText } = en.howItWorks

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  })

  const pathLength = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 90,
  })

  return (
    <section id="how" ref={containerRef} className="relative py-28 md:py-40 px-6 md:px-12 max-w-7xl mx-auto">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mb-20"
      >
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8B5CF6] block mb-3">
          02 // THE PROCESS
        </span>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          {headline}
        </h2>
      </motion.div>

      {/* 3 Step Pipeline with connecting line */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-20">
        {/* Desktop connecting SVG line */}
        <div className="hidden md:block absolute top-12 left-0 w-full h-[2px] pointer-events-none -z-10">
          <svg className="w-full h-2" preserveAspectRatio="none">
            <line
              x1="10%"
              y1="1"
              x2="90%"
              y2="1"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="2"
            />
            <motion.line
              x1="10%"
              y1="1"
              x2="90%"
              y2="1"
              stroke="#00E5FF"
              strokeWidth="2"
              style={{ pathLength }}
            />
          </svg>
        </div>

        {steps.map((step, idx) => {
          const Icon = icons[idx]
          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="glass-panel p-8 flex flex-col justify-between relative group hover:border-[#00E5FF]/30 transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-sm tracking-widest text-white/40">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-[#8B93A7] text-sm md:text-base leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Honest Limitations Note */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6 }}
        className="glass-panel p-6 md:p-8 border border-white/10 bg-[#0B0D14]/80 flex items-start gap-4"
      >
        <AlertCircle className="h-5 w-5 text-[#FFB020] shrink-0 mt-0.5" />
        <div>
          <h4 className="font-mono text-xs tracking-wider uppercase text-[#FFB020] mb-1 font-semibold">
            {limitationsTitle}
          </h4>
          <p className="text-sm text-[#8B93A7] leading-relaxed">
            {limitationsText}
          </p>
        </div>
      </motion.div>
    </section>
  )
}
