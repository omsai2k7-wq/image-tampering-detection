"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { DetectionResult } from "@/lib/detection/types"
import ScoreGauge from "./ScoreGauge"
import NextSteps from "./NextSteps"
import BorderBeam from "@/components/shared/BorderBeam"
import { en } from "@/lib/i18n/en"
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Copy,
  Check,
  MessageSquare,
  RefreshCw,
  Info,
} from "lucide-react"

interface ResultPanelProps {
  result: DetectionResult
  previewUrl: string
  onReset: () => void
  onAskAdria: (summary: string) => void
}

export default function ResultPanel({
  result,
  previewUrl,
  onReset,
  onAskAdria,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false)
  const strings = en.analyze.result

  const verdictConfig = {
    likely_authentic: {
      label: strings.labels.likely_authentic,
      headline: strings.verdicts.likely_authentic,
      borderColor: "border-[#2CFFA7]",
      badgeBg: "bg-[#2CFFA7]/10 text-[#2CFFA7] border-[#2CFFA7]/30",
      icon: ShieldCheck,
    },
    suspicious: {
      label: strings.labels.suspicious,
      headline: strings.verdicts.suspicious,
      borderColor: "border-[#FFB020]",
      badgeBg: "bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30",
      icon: AlertTriangle,
    },
    likely_manipulated: {
      label: strings.labels.likely_manipulated,
      headline: strings.verdicts.likely_manipulated,
      borderColor: "border-[#FF2E4D]",
      badgeBg: "bg-[#FF2E4D]/10 text-[#FF2E4D] border-[#FF2E4D]/30",
      icon: ShieldAlert,
    },
  }[result.label]

  const VerdictIcon = verdictConfig.icon

  const handleCopySummary = () => {
    const summaryText = `TRACE Forensic Result:
Verdict: ${verdictConfig.label}
Likelihood Score: ${(result.score * 100).toFixed(0)}%
Confidence: ${strings.confidenceLevels[result.confidence]}
Timestamp: ${result.processedAt}
Assessment ID: ${result.requestId}

Disclaimer: ${strings.disclaimer}`

    navigator.clipboard.writeText(summaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConsultAdria = () => {
    const summaryText = `TRACE Analysis Summary:
Verdict: ${verdictConfig.label}
Likelihood: ${(result.score * 100).toFixed(0)}%
Confidence: ${result.confidence}
Primary Observations: ${result.details.map((d) => d.text).join(" ")}`
    onAskAdria(summaryText)
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Top Main Result Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full glass-panel p-8 md:p-12 relative overflow-hidden"
      >
        <BorderBeam
          size={140}
          duration={7}
          intensity={0.65}
          colorFrom={
            result.label === "likely_authentic"
              ? "rgba(44, 255, 167, 0.45)"
              : result.label === "suspicious"
              ? "rgba(255, 176, 32, 0.45)"
              : "rgba(255, 46, 77, 0.45)"
          }
          colorTo="#F0FBFF"
          enableTilt={true}
        />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left: Preview image with thin verdict border */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div
              className={`relative max-h-72 w-full rounded-2xl overflow-hidden border-2 bg-black/60 p-1 transition-all duration-700 ${verdictConfig.borderColor}`}
            >
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={en.analyze.preview.altText}
                  className="max-h-64 w-full object-contain rounded-xl"
                />
              )}
            </div>

            <div className="mt-4 font-mono text-[11px] tracking-widest text-white/40 uppercase">
              ID: {result.requestId.slice(0, 8)} {" // "} {result.provider.toUpperCase()}
            </div>
          </div>

          {/* Right: Score Gauge & Verdict Headline */}
          <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wider border uppercase ${verdictConfig.badgeBg}`}
              >
                <VerdictIcon className="h-3.5 w-3.5" />
                {verdictConfig.label}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono text-white/60 bg-white/[0.04] border border-white/10 uppercase">
                {strings.confidence}: {strings.confidenceLevels[result.confidence]}
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-snug">
              {verdictConfig.headline}
            </h3>

            <div className="w-full flex justify-center md:justify-start">
              <ScoreGauge score={result.score} label={result.label} />
            </div>
          </div>
        </div>

        {/* Why we think this (2-4 reasons) */}
        <div className="mt-10 pt-8 border-t border-white/10">
          <h4 className="font-mono text-xs uppercase tracking-[0.18em] text-[#00E5FF] mb-4 font-semibold">
            {strings.reasonsTitle}
          </h4>
          <ul className="space-y-2.5">
            {result.details.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 text-sm md:text-base text-[#8B93A7] leading-relaxed"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF] mt-2 shrink-0" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mandatory Disclaimer (always visible, not collapsible) */}
        <div className="mt-8 p-4 rounded-xl border border-white/10 bg-[#0B0D14]/90 flex items-start gap-3">
          <Info className="h-4 w-4 text-[#FFB020] shrink-0 mt-0.5" />
          <p className="text-xs md:text-sm text-[#8B93A7] leading-relaxed">
            {strings.disclaimer}
          </p>
        </div>

        {/* Action Controls */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleConsultAdria}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#00E5FF]/20 to-[#8B5CF6]/20 border border-[#00E5FF]/40 text-sm font-semibold text-white hover:border-[#00E5FF] transition-all"
            >
              <MessageSquare className="h-4 w-4 text-[#00E5FF]" />
              {strings.actions.askAdria}
            </button>

            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/10 text-xs font-mono tracking-wider text-[#8B93A7] hover:text-white hover:border-white/20 transition-all uppercase"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#2CFFA7]" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{strings.actions.copySummary}</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#8B93A7] hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {strings.actions.checkAnother}
          </button>
        </div>
      </motion.div>

      {/* Next Steps Section */}
      <NextSteps />
    </div>
  )
}
