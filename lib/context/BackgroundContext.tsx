"use client"

import React, { createContext, useContext, useState, useCallback, useMemo } from "react"
import type { Phase } from "@/components/analyze/AnalyzeZone"
import type { Label } from "@/lib/detection/types"

export type VerdictType = Label

export interface BackgroundContextValue {
  phase: Phase
  verdict: VerdictType | null
  isAdriaOpen: boolean
  isShaderReady: boolean
  setPhase: (phase: Phase) => void
  setVerdict: (verdict: VerdictType | null) => void
  setIsAdriaOpen: (open: boolean) => void
  setShaderReady: (ready: boolean) => void
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null)

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [verdict, setVerdict] = useState<VerdictType | null>(null)
  const [isAdriaOpen, setIsAdriaOpen] = useState(false)
  const [isShaderReady, setShaderReadyState] = useState(false)

  const setShaderReady = useCallback((ready: boolean) => {
    setShaderReadyState(ready)
  }, [])

  const value = useMemo(
    () => ({
      phase,
      verdict,
      isAdriaOpen,
      isShaderReady,
      setPhase,
      setVerdict,
      setIsAdriaOpen,
      setShaderReady,
    }),
    [phase, verdict, isAdriaOpen, isShaderReady, setShaderReady]
  )

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  )
}

export function useBackgroundState(): BackgroundContextValue {
  const context = useContext(BackgroundContext)
  if (!context) {
    return {
      phase: "idle",
      verdict: null,
      isAdriaOpen: false,
      isShaderReady: true,
      setPhase: () => {},
      setVerdict: () => {},
      setIsAdriaOpen: () => {},
      setShaderReady: () => {},
    }
  }
  return context
}
