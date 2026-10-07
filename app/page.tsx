"use client"

import { useState, useEffect } from "react"
import LoadingScreen from "@/components/intro/LoadingScreen"
import CustomCursor from "@/components/shared/CustomCursor"
import Navbar from "@/components/shared/Navbar"
import Hero from "@/components/landing/Hero"
import ProblemSection from "@/components/landing/ProblemSection"
import HowItWorks from "@/components/landing/HowItWorks"
import AnalyzeZone from "@/components/analyze/AnalyzeZone"
import AboutSection from "@/components/about/AboutSection"
import Footer from "@/components/shared/Footer"
import AdriaLauncher from "@/components/adria/AdriaLauncher"
import AdriaPanel from "@/components/adria/AdriaPanel"
import { useBackgroundState } from "@/lib/context/BackgroundContext"

export default function Home() {
  const [loadingComplete, setLoadingComplete] = useState<boolean>(false)
  const [adriaOpen, setAdriaOpen] = useState<boolean>(false)
  const [adriaSummary, setAdriaSummary] = useState<string | null>(null)
  const { setIsAdriaOpen } = useBackgroundState()

  // Sync ADRIA focus state with background dimming
  useEffect(() => {
    setIsAdriaOpen(adriaOpen)
  }, [adriaOpen, setIsAdriaOpen])

  // Session storage intro checking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const forceIntro = urlParams.get("intro") === "1"
    const hasSeenIntro = sessionStorage.getItem("trace_intro_seen")

    if (hasSeenIntro && !forceIntro) {
      const timer = setTimeout(() => {
        setLoadingComplete(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleLoadingFinished = () => {
    sessionStorage.setItem("trace_intro_seen", "true")
    setLoadingComplete(true)
  }

  const handleAskAdria = (summary: string) => {
    setAdriaSummary(summary)
    setAdriaOpen(true)
  }

  return (
    <>
      {/* Skip to Content for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#00E5FF] focus:text-black focus:font-semibold focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Signature Loading Screen */}
      {!loadingComplete && (
        <LoadingScreen onComplete={handleLoadingFinished} />
      )}

      {/* Custom Precision Cursor */}
      <CustomCursor />

      {/* Global Nav Bar */}
      <Navbar visible={loadingComplete} />

      {/* Main Content Flow */}
      <main
        id="main-content"
        className={`relative z-10 flex flex-col w-full transition-opacity duration-700 ${
          !loadingComplete ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <AnalyzeZone onAskAdria={handleAskAdria} />
        <AboutSection />
      </main>

      {/* Global Footer */}
      <Footer />

      {/* ADRIA AI Assistant (Orb Launcher + Chat Panel) */}
      {loadingComplete && (
        <>
          <AdriaLauncher
            isOpen={adriaOpen}
            onToggle={() => setAdriaOpen(true)}
          />
          <AdriaPanel
            isOpen={adriaOpen}
            onClose={() => {
              setAdriaOpen(false)
              setAdriaSummary(null)
            }}
            initialSummary={adriaSummary}
          />
        </>
      )}
    </>
  )
}
