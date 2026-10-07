"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import AdriaOrb, { OrbStatus } from "./AdriaOrb"
import VoiceButton from "./VoiceButton"
import { useSpeechRecognition } from "./useSpeechRecognition"
import { useSpeechSynthesis } from "./useSpeechSynthesis"
import { SUPPORTED_LANGUAGES, Language } from "@/lib/adria/languages"
import BorderBeam from "@/components/shared/BorderBeam"
import { en } from "@/lib/i18n/en"
import { X, Send, Volume2, VolumeX, Sparkles } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface AdriaPanelProps {
  isOpen: boolean
  onClose: () => void
  initialSummary?: string | null
}

export default function AdriaPanel({
  isOpen,
  onClose,
  initialSummary,
}: AdriaPanelProps) {
  const [selectedLang, setSelectedLang] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("trace_adria_lang")
      if (saved) {
        const found = SUPPORTED_LANGUAGES.find((l) => l.code === saved)
        if (found) return found
      }
    }
    return SUPPORTED_LANGUAGES[0]
  })

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello, I am ADRIA. I can help explain your image forensic scores, guide you through evidence preservation, or direct you to official cyber helplines (1930 / cybercrime.gov.in). How can I assist you?",
    },
  ])

  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Speech Hooks
  const {
    supported: sttSupported,
    listening,
    transcript,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition(selectedLang.speechLang)

  const {
    speaking,
    muted,
    speak,
    cancel: cancelSpeech,
    toggleMute,
  } = useSpeechSynthesis(selectedLang.speechLang)

  // Sync transcript into input
  useEffect(() => {
    if (transcript) {
      const timer = setTimeout(() => {
        setInput(transcript)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [transcript])

  // Derive Orb Status
  let orbStatus: OrbStatus = "idle"
  if (listening) orbStatus = "listening"
  else if (isStreaming) orbStatus = "thinking"
  else if (speaking) orbStatus = "speaking"

  // Auto-scroll messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const handleLanguageChange = (langCode: string) => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode) || SUPPORTED_LANGUAGES[0]
    setSelectedLang(lang)
    if (typeof window !== "undefined") {
      localStorage.setItem("trace_adria_lang", lang.code)
    }
  }

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || input).trim()
    if (!content || isStreaming) return

    cancelSpeech()
    if (listening) stopListening()

    const newMessages: Message[] = [...messages, { role: "user", content }]
    setMessages(newMessages)
    setInput("")
    setIsStreaming(true)

    // Add empty assistant placeholder for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const response = await fetch("/api/adria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(-12),
          lang: selectedLang.code,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error("Failed to receive stream.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk

        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: "assistant",
            content: accumulated,
          }
          return updated
        })
      }

      // Voice readout if unmuted
      if (!muted) {
        speak(accumulated)
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content:
            "I encountered a temporary connection issue. Please feel free to retry your question, or contact local helplines (1930 / Tele-MANAS 14416) for urgent assistance.",
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }

  // Initial summary handoff
  useEffect(() => {
    if (initialSummary && isOpen) {
      const timer = setTimeout(() => {
        handleSendMessage(`Can you explain this result for me?\n\n${initialSummary}`)
      }, 0)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSummary, isOpen])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(12px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(12px)" }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-[420px] sm:h-[640px] flex flex-col bg-[#05060A]/80 sm:rounded-3xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden"
      role="dialog"
      aria-label="ADRIA Assistant Dialog"
    >
      <BorderBeam duration={10} size={120} intensity={0.55} radius="1.5rem" />

      {/* Scanline overlay inside panel */}
      <div className="scanlines-overlay pointer-events-none absolute inset-0 opacity-40" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <AdriaOrb status={orbStatus} size={36} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm tracking-wide">
                {en.adria.name}
              </h3>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded-full border border-[#00E5FF]/20">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-[#8B93A7] font-mono">
              {orbStatus === "listening"
                ? en.adria.statusListening
                : orbStatus === "thinking"
                ? en.adria.statusThinking
                : orbStatus === "speaking"
                ? en.adria.statusSpeaking
                : en.adria.statusIdle}
            </p>
          </div>
        </div>

        {/* Header Controls: Language, Mute, Close */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={selectedLang.code}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-white/5 border border-white/10 text-xs text-white rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-white/10"
            aria-label="Select ADRIA language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-[#0B0D14] text-white">
                {l.nativeLabel}
              </option>
            ))}
          </select>

          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg text-[#8B93A7] hover:text-white hover:bg-white/5 transition-colors"
            title={muted ? "Unmute speech output" : "Mute speech output"}
            aria-label={muted ? "Unmute speech" : "Mute speech"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Close Button */}
          <button
            onClick={() => {
              cancelSpeech()
              onClose()
            }}
            className="p-1.5 rounded-lg text-[#8B93A7] hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close ADRIA"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              m.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[#00E5FF] text-black font-medium rounded-tr-none shadow-[0_0_20px_rgba(0,229,255,0.2)]"
                  : "bg-white/[0.05] border border-white/10 text-[#E9ECF5] rounded-tl-none"
              }`}
            >
              {m.content || (
                <span className="inline-block animate-pulse text-[#00E5FF]">
                  ● ● ●
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Chips */}
      {messages.length <= 2 && (
        <div className="relative z-10 px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
          {en.adria.suggestions.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              className="shrink-0 text-xs text-[#8B93A7] hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-full px-3 py-1 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="h-3 w-3 text-[#00E5FF]" />
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="relative z-10 p-3 border-t border-white/10 bg-white/[0.02]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={en.adria.placeholder}
            disabled={isStreaming}
            className="selectable flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-[#00E5FF] transition-colors"
          />

          <VoiceButton
            supported={sttSupported}
            listening={listening}
            onToggle={() => {
              if (listening) stopListening()
              else startListening()
            }}
            disabled={isStreaming}
          />

          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-2.5 rounded-full bg-[#00E5FF] text-black disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_15px_#00E5FF] transition-all"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-2 text-[10px] text-center text-[#8B93A7]/70 font-mono">
          {en.adria.footerDisclaimer}
        </p>
      </div>
    </motion.div>
  )
}
