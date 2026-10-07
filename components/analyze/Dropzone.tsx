"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, ArrowDown, Lock, AlertTriangle, Image as ImageIcon } from "lucide-react"
import { en } from "@/lib/i18n/en"
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/validate"
import BorderBeam from "@/components/shared/BorderBeam"

interface DropzoneProps {
  onFileSelected: (file: File) => void
}

export default function Dropzone({ onFileSelected }: DropzoneProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const strings = en.analyze.dropzone

  const triggerError = (msg: string) => {
    setErrorMessage(msg)
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  const validateAndProceed = useCallback(
    (file: File) => {
      setErrorMessage(null)

      // 1. File size check
      if (file.size > MAX_UPLOAD_BYTES) {
        triggerError(`File size exceeds ${MAX_UPLOAD_MB} MB limit.`)
        return
      }

      // 2. MIME type check
      const validTypes = ["image/jpeg", "image/png", "image/webp"]
      if (!validTypes.includes(file.type)) {
        triggerError("Invalid file format. Please upload JPG, PNG, or WebP.")
        return
      }

      // 3. Image dimensions check
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        if (img.width < 64 || img.height < 64) {
          triggerError("Image dimensions must be at least 64 × 64 pixels.")
          return
        }
        onFileSelected(file)
      }

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        triggerError("Failed to decode image. Please check the file.")
      }

      img.src = objectUrl
    },
    [onFileSelected]
  )

  // Clipboard paste listener (Ctrl/Cmd + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile()
          if (file) {
            validateAndProceed(file)
            break
          }
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [validateAndProceed])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        validateAndProceed(acceptedFiles[0])
      }
    },
    [validateAndProceed]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    multiple: false,
  })

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Dropzone Container */}
      <div
        {...getRootProps()}
        data-cursor="drop"
        tabIndex={0}
        role="button"
        aria-label="Upload an image to inspect for manipulation"
        className={`relative w-full min-h-[420px] rounded-3xl p-8 flex flex-col items-center justify-between cursor-pointer transition-all duration-300 outline-none select-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060A] ${
          isDragActive
            ? "border-2 border-[#00E5FF] bg-[#00E5FF]/5 shadow-[0_0_50px_rgba(0,229,255,0.15)]"
            : "glass-panel hover:border-white/20 hover:shadow-[0_0_40px_rgba(0,229,255,0.08)]"
        } ${isShaking ? "animate-shake" : ""}`}
      >
        <BorderBeam
          size={120}
          duration={isDragActive ? 4 : 7}
          intensity={isDragActive ? 0.9 : 0.6}
          enableTilt={true}
        />
        <input {...getInputProps()} accept="image/jpeg,image/png,image/webp" />

        {/* Top Status / Category Tag */}
        <div className="w-full flex items-center justify-between text-[11px] font-mono tracking-widest text-white/40 uppercase">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-[#00E5FF]" />
            RAW_INPUT_STREAM
          </span>
          <span>MAX 8MB // 24-BIT</span>
        </div>

        {/* Center Prompt */}
        <div className="flex flex-col items-center text-center my-8">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-3xl border transition-all duration-300 mb-6 ${
              isDragActive
                ? "border-[#00E5FF] bg-[#00E5FF]/20 text-[#00E5FF] scale-110"
                : "border-white/10 bg-white/[0.04] text-[#8B5CF6] group-hover:scale-105"
            }`}
          >
            {isDragActive ? (
              <ArrowDown className="h-8 w-8 animate-bounce text-[#00E5FF]" />
            ) : (
              <UploadCloud className="h-8 w-8 text-[#00E5FF]" />
            )}
          </div>

          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
            {isDragActive ? strings.dragOver : strings.title}
          </h3>

          <p className="text-[#8B93A7] text-sm md:text-base max-w-sm mb-3">
            {strings.sub}
          </p>

          <span className="inline-block font-mono text-xs tracking-wider text-white/40 bg-white/[0.03] px-3 py-1 rounded-full border border-white/5">
            {strings.clipboardHint}
          </span>
        </div>

        {/* Footer Privacy & Rights Statement */}
        <div className="w-full pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8B93A7]">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-[#00E5FF]" />
            <span>{strings.privacyNote}</span>
          </div>
          <span className="text-white/40 text-[11px]">
            {strings.rightsNote}
          </span>
        </div>
      </div>

      {/* Inline Friendly Error with aria-live */}
      <div aria-live="polite" className="h-8 mt-3 flex items-center justify-center">
        {errorMessage && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#FF2E4D] bg-[#FF2E4D]/10 border border-[#FF2E4D]/20 px-3 py-1 rounded-full">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  )
}
