"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import BorderBeam from "@/components/shared/BorderBeam"
import { en } from "@/lib/i18n/en"
import { useReducedMotion } from "@/hooks/useReducedMotion"

// Easily editable team array so team can add roles/links later
export interface TeamMember {
  name: string
  initials: string
  role?: string
  link?: string
}

const TEAM_MEMBERS: TeamMember[] = [
  { name: "Chethana Poorvi K N", initials: "CP" },
  { name: "P. Harshini Reddy", initials: "HR" },
  { name: "P. Omsai Reddy", initials: "OR" },
  { name: "Pavan Tej R", initials: "PT" },
]

export default function AboutSection() {
  const reducedMotion = useReducedMotion()
  const { eyebrow, headline, body } = en.about

  return (
    <section id="about" className="relative py-28 md:py-40 px-6 md:px-12 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mb-16 md:mb-20"
      >
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#00E5FF] block mb-3 font-semibold">
          {eyebrow}
        </span>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
          {headline}
        </h2>
        <p className="text-base md:text-lg text-[#8B93A7] leading-relaxed">
          {body}
        </p>
      </motion.div>

      {/* 4 Member Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {TEAM_MEMBERS.map((member, idx) => (
          <TeamCard key={member.name} member={member} index={idx} reducedMotion={reducedMotion} />
        ))}
      </div>
    </section>
  )
}

function TeamCard({
  member,
  index,
  reducedMotion,
}: {
  member: TeamMember
  index: number
  reducedMotion: boolean
}) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    // Max 3-4 degree tilt
    const rx = -(y / (rect.height / 2)) * 3.5
    const ry = (x / (rect.width / 2)) * 3.5
    setTilt({ rx, ry })
  }

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
      }}
      className="relative glass-panel p-8 flex flex-col items-center text-center transition-all duration-200 hover:border-white/20 hover:shadow-[0_0_30px_rgba(0,229,255,0.06)]"
    >
      <BorderBeam
        size={110}
        duration={8}
        delay={index * 1.8}
        intensity={0.5}
      />

      {/* Monogram Avatar with rotating gradient ring */}
      <div className="relative h-24 w-24 mb-6 flex items-center justify-center">
        <div
          className={`absolute inset-0 rounded-full p-[2px] ${
            reducedMotion ? "" : "animate-[spin_10s_linear_infinite]"
          }`}
          style={{
            background:
              "conic-gradient(from 0deg, #00E5FF, #8B5CF6, transparent, #00E5FF)",
          }}
        >
          <div className="h-full w-full rounded-full bg-[#05060A]" />
        </div>

        <span className="relative z-10 font-mono text-2xl font-bold tracking-widest text-white">
          {member.initials}
        </span>
      </div>

      <h3 className="text-lg font-bold text-white tracking-wide break-words whitespace-normal max-w-full">
        {member.name}
      </h3>
    </motion.div>
  )
}
