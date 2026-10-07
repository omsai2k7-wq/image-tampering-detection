"use client"

import { motion } from "framer-motion"
import { EyeOff, AlertTriangle, ShieldAlert } from "lucide-react"
import BorderBeam from "@/components/shared/BorderBeam"
import { en } from "@/lib/i18n/en"

const icons = [EyeOff, AlertTriangle, ShieldAlert]

export default function ProblemSection() {
  const { headline, cards } = en.problem

  return (
    <section id="problem" className="relative py-28 md:py-40 px-6 md:px-12 max-w-7xl mx-auto">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mb-16 md:mb-24"
      >
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#00E5FF] block mb-3">
          01 // THE SYSTEM COLLAPSE
        </span>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          {headline}
        </h2>
      </motion.div>

      {/* 3 Stacking Cards with Staggered BorderBeam */}
      <div className="space-y-6 md:space-y-8">
        {cards.map((card, index) => {
          const Icon = icons[index]
          return (
            <motion.div
              key={card.number}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, delay: index * 0.12 }}
              className="relative glass-panel p-8 md:p-12 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_40px_rgba(0,229,255,0.06)]"
            >
              <BorderBeam
                size={130}
                duration={7.5}
                delay={index * 2.5}
                intensity={0.55}
                enableTilt={true}
              />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start md:items-center gap-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-[#00E5FF]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs tracking-widest text-[#8B5CF6] font-semibold">
                        {card.number}
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold text-white">
                        {card.title}
                      </h3>
                    </div>
                    <p className="text-[#8B93A7] text-base md:text-lg max-w-2xl leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
