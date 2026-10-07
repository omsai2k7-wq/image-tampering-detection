"use client"

import { useEffect, useRef } from "react"
import { useReducedMotion } from "@/hooks/useReducedMotion"

interface Particle {
  originX: number
  originY: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
}

export default function GlitchFace() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    const particles: Particle[] = []
    const mouse = { x: -1000, y: -1000, active: false }

    const isMobile = window.innerWidth < 768
    const numPoints = isMobile ? 700 : 1800

    // Setup canvas resolution
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    const width = canvas.clientWidth || 450
    const height = canvas.clientHeight || 550
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Generate face silhouette offscreen
    const offscreen = document.createElement("canvas")
    offscreen.width = 300
    offscreen.height = 380
    const offCtx = offscreen.getContext("2d")

    if (offCtx) {
      offCtx.fillStyle = "#ffffff"
      offCtx.beginPath()
      // Stylized human face / portrait silhouette
      // Head contour
      offCtx.ellipse(150, 160, 95, 125, 0, 0, Math.PI * 2)
      offCtx.fill()

      // Neck contour
      offCtx.beginPath()
      offCtx.rect(110, 260, 80, 110)
      offCtx.fill()

      // Eyebrow and eye hollows for facial contouring
      offCtx.globalCompositeOperation = "destination-out"
      offCtx.beginPath()
      offCtx.ellipse(108, 145, 18, 10, -0.1, 0, Math.PI * 2)
      offCtx.ellipse(192, 145, 18, 10, 0.1, 0, Math.PI * 2)
      // Nose bridge contour
      offCtx.ellipse(150, 190, 8, 22, 0, 0, Math.PI * 2)
      // Mouth contour
      offCtx.ellipse(150, 235, 24, 7, 0, 0, Math.PI * 2)
      offCtx.fill()
      offCtx.globalCompositeOperation = "source-over"

      // Sample pixels
      const imgData = offCtx.getImageData(0, 0, 300, 380).data
      const validPoints: { x: number; y: number }[] = []

      for (let y = 0; y < 380; y += 4) {
        for (let x = 0; x < 300; x += 4) {
          const index = (y * 300 + x) * 4
          if (imgData[index + 3] > 140) {
            validPoints.push({
              x: (x / 300) * (width * 0.8) + width * 0.1,
              y: (y / 380) * (height * 0.8) + height * 0.1,
            })
          }
        }
      }

      // Pick points randomly
      const step = Math.max(1, Math.floor(validPoints.length / numPoints))
      for (let i = 0; i < validPoints.length && particles.length < numPoints; i += step) {
        const pt = validPoints[i]
        const isCyan = Math.random() > 0.45
        particles.push({
          originX: pt.x,
          originY: pt.y,
          x: pt.x,
          y: pt.y,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 1.5 + 0.8,
          color: isCyan ? "rgba(0, 229, 255, " : "rgba(139, 92, 246, ",
        })
      }
    }

    // Glitch state
    let isGlitching = false
    let glitchBandTop = 0
    let glitchBandBottom = 0
    let glitchOffset = 0
    let lastGlitchTime = performance.now()

    const triggerGlitch = () => {
      isGlitching = true
      glitchBandTop = Math.random() * height * 0.6 + height * 0.1
      glitchBandBottom = glitchBandTop + (Math.random() * 60 + 40)
      glitchOffset = (Math.random() - 0.5) * 40
      setTimeout(() => {
        isGlitching = false
      }, 160)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }

    const handleMouseLeave = () => {
      mouse.active = false
    }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    // Render loop
    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height)

      if (!reducedMotion && time - lastGlitchTime > 5000) {
        triggerGlitch()
        lastGlitchTime = time
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        if (!reducedMotion) {
          // Subtle gentle drift
          p.originX += p.vx
          p.originY += p.vy
          if (Math.abs(p.vx) > 0.4) p.vx *= -1
          if (Math.abs(p.vy) > 0.4) p.vy *= -1

          // Mouse repulsion
          if (mouse.active) {
            const dx = p.x - mouse.x
            const dy = p.y - mouse.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            const maxDist = 90
            if (dist < maxDist && dist > 0) {
              const force = (1 - dist / maxDist) * 18
              p.x += (dx / dist) * force
              p.y += (dy / dist) * force
            }
          }

          // Return to origin with spring
          let targetX = p.originX
          const targetY = p.originY

          if (isGlitching && p.originY >= glitchBandTop && p.originY <= glitchBandBottom) {
            targetX += glitchOffset
          }

          p.x += (targetX - p.x) * 0.1
          p.y += (targetY - p.y) * 0.1
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)

        if (isGlitching && p.y >= glitchBandTop && p.y <= glitchBandBottom) {
          ctx.fillStyle = i % 2 === 0 ? "rgba(0, 229, 255, 0.9)" : "rgba(255, 46, 77, 0.9)"
        } else {
          ctx.fillStyle = p.color + "0.75)"
        }

        ctx.fill()
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    if (reducedMotion) {
      render(0)
    } else {
      animationFrameId = requestAnimationFrame(render)
    }

    return () => {
      cancelAnimationFrame(animationFrameId)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [reducedMotion])

  return (
    <div className="relative flex h-[480px] w-full max-w-[480px] items-center justify-center">
      <canvas
        ref={canvasRef}
        className="block h-full w-full object-contain"
        aria-label="Abstract particulate scan representation of facial biometric authenticity"
      />
      {/* Decorative subtle scanning ring behind face */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-full border border-[#00E5FF]/10 blur-[1px]"
        style={{
          boxShadow: "0 0 80px rgba(0, 229, 255, 0.08)",
        }}
      />
    </div>
  )
}
