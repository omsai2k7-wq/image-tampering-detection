"use client"

import { useEffect, useState } from "react"
import MagneticButton from "@/components/shared/MagneticButton"
import BorderBeam from "@/components/shared/BorderBeam"
import { en } from "@/lib/i18n/en"
import { Sparkles, RefreshCw, FileText } from "lucide-react"

interface PreviewCardProps {
  file: File
  onProceed: () => void
  onReset: () => void
}

export default function PreviewCard({ file, onProceed, onReset }: PreviewCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const strings = en.analyze.preview

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const timer = setTimeout(() => {
      setPreviewUrl(url)
    }, 0)

    const img = new Image()
    img.onload = () => {
      setDimensions({ width: img.width, height: img.height })
    }
    img.src = url

    return () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
    }
  }, [file])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto glass-panel p-6 md:p-8 flex flex-col items-center">
      <BorderBeam size={120} duration={7} delay={1.2} enableTilt={true} />

      {/* File Metadata Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-white/10 font-mono text-xs text-[#8B93A7]">
        <div className="flex items-center gap-2 text-white">
          <FileText className="h-4 w-4 text-[#00E5FF]" />
          <span className="truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
        </div>

        <div className="flex items-center gap-4 text-white/50">
          <span>{formatFileSize(file.size)}</span>
          {dimensions && (
            <span>
              {dimensions.width} × {dimensions.height} PX
            </span>
          )}
        </div>
      </div>

      {/* Image Container with 60vh limit */}
      <div className="relative w-full max-h-[60vh] rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center p-2 mb-8 border border-white/5">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={strings.altText}
            draggable={false}
            className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-2xl pointer-events-none"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <MagneticButton
          conicBorder
          onClick={onProceed}
          className="bg-white px-8 py-3.5 text-sm font-semibold text-black tracking-wide hover:shadow-[0_0_30px_rgba(0,229,255,0.4)]"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00E5FF]" />
            {strings.analyseBtn}
          </span>
        </MagneticButton>

        <button
          onClick={onReset}
          className="px-6 py-3.5 rounded-full text-sm font-medium text-[#8B93A7] hover:text-white transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {strings.chooseAnotherBtn}
        </button>
      </div>
    </div>
  )
}
