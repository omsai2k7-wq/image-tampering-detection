"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface SpeechRecognitionEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      0: {
        transcript: string
      }
    }
  }
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

export interface UseSpeechRecognitionReturn {
  supported: boolean
  listening: boolean
  transcript: string
  start: () => void
  stop: () => void
  error: string | null
}

export function useSpeechRecognition(lang: string = "en-IN"): UseSpeechRecognitionReturn {
  const [supported, setSupported] = useState<boolean>(false)
  const [listening, setListening] = useState<boolean>(false)
  const [transcript, setTranscript] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance
    }

    const SpeechRecognitionConstructor =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition

    if (!SpeechRecognitionConstructor) {
      return
    }

    const timer = setTimeout(() => {
      setSupported(true)
    }, 0)

    const recognition = new SpeechRecognitionConstructor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let current = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript
      }
      setTranscript(current)
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.warn("[SpeechRecognition] error:", e.error)
      setError(e.error)
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      clearTimeout(timer)
      recognition.abort()
    }
  }, [lang])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setError(null)
    setTranscript("")
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {
      // Already running or failed
    }
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
      setListening(false)
    } catch {
      // Ignore
    }
  }, [])

  return {
    supported,
    listening,
    transcript,
    start,
    stop,
    error,
  }
}
