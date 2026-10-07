"use client"

import React from "react"
import { BackgroundProvider } from "@/lib/context/BackgroundContext"
import ShaderBackground from "@/components/shared/ShaderBackground"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BackgroundProvider>
      <ShaderBackground />
      {children}
    </BackgroundProvider>
  )
}
