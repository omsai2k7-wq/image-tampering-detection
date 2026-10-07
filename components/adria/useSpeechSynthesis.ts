"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export function useSpeechSynthesis(speechLang: string = "en-IN") {
  const [supported, setSupported] = useState<boolean>(false)
  const [speaking, setSpeaking] = useState<boolean>(false)
  const [muted, setMuted] = useState<boolean>(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return
    }

    const timer = setTimeout(() => {
      setSupported(true)
    }, 0)

    const updateVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices()
    }

    updateVoices()
    window.speechSynthesis.onvoiceschanged = updateVoices

    return () => {
      clearTimeout(timer)
      window.speechSynthesis.cancel()
    }
  }, [])

  const stripMarkdown = (text: string): string => {
    return text
      .replace(/[*_#`~[\]]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .trim()
  }

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!supported || muted || typeof window === "undefined") return

      window.speechSynthesis.cancel()
      const cleanText = stripMarkdown(text)
      if (!cleanText) return

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = speechLang

      // Find matching voice if available
      const matchingVoice = voicesRef.current.find(
        (v) =>
          v.lang.toLowerCase() === speechLang.toLowerCase() ||
          v.lang.startsWith(speechLang.slice(0, 2))
      )
      if (matchingVoice) {
        utterance.voice = matchingVoice
      }

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)

      window.speechSynthesis.speak(utterance)
    },
    [supported, muted, speechLang]
  )

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      if (!prev) {
        cancel()
      }
      return !prev
    })
  }, [cancel])

  return {
    supported,
    speaking,
    muted,
    speak,
    cancel,
    toggleMute,
  }
}
