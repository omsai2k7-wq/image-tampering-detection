"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const vertSrc = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos,0.0,1.0); }`

const fragSrc = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2  u_res;
uniform float u_time;

// robust tanh fallback
float tanh1(float x){ float e = exp(2.0*x); return (e-1.0)/(e+1.0); }
vec4 tanh4(vec4 v){ return vec4(tanh1(v.x), tanh1(v.y), tanh1(v.z), tanh1(v.w)); }

void main(){
  vec3 FC = vec3(gl_FragCoord.xy, 0.0);
  vec3 r  = vec3(u_res, max(u_res.x, u_res.y));
  float t = u_time;

  vec4 o = vec4(0.0);

  // === your code with safe inits & valid mat2 multiply, tanh replacement ===
  vec3 p = vec3(0.0);
  vec3 v = vec3(1.0, 2.0, 6.0);
  float i = 0.0, z = 1.0, d = 1.0, f = 1.0;

  for ( ; i++ < 5e1;
        o.rgb += (cos((p.x + z + v) * 0.1) + 1.0) / d / f / z )
  {
    p = z * normalize(FC * 2.0 - r.xyy);

    vec4 m = cos((p + sin(p)).y * 0.4 + vec4(0.0, 33.0, 11.0, 0.0));
    p.xz = mat2(m) * p.xz;

    p.x += t / 0.2;

    z += ( d = length(cos(p / v) * v + v.zxx / 7.0) /
           ( f = 2.0 + d / exp(p.y * 0.2) ) );
  }

  o = tanh4(0.2 * o);
  o.a = 1.0;
  fragColor = o;
}`

export interface AtcShaderProps {
  className?: string
  /** 0.25 to 1. Lower is cheaper. The shader runs 50 iterations per pixel. */
  renderScale?: number
  /** Time multiplier. */
  speed?: number
  /** Freeze rendering (e.g. when tab is hidden). */
  paused?: boolean
  /** Called once the first frame has been drawn (useful for the loader). */
  onReady?: () => void
}

export default function ShaderDemo_ATC({
  className,
  renderScale,
  speed = 1,
  paused = false,
  onReady,
}: AtcShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const speedRef = useRef(speed)
  const pausedRef = useRef(paused)
  const scaleRef = useRef<number>(0.5)
  const readyRef = useRef(onReady)
  const [error, setError] = useState<string | null>(null)

  // Initialize and track scale
  useEffect(() => {
    let initialScale = renderScale
    if (initialScale === undefined && typeof window !== "undefined") {
      const saved = sessionStorage.getItem("trace_shader_scale")
      if (saved) {
        const val = parseFloat(saved)
        if (!isNaN(val) && val >= 0.3 && val <= 0.5) {
          initialScale = val
        }
      }
      if (initialScale === undefined) {
        initialScale = window.innerWidth < 768 ? 0.4 : 0.5
      }
    }
    scaleRef.current = initialScale ?? 0.5
  }, [renderScale])

  useEffect(() => {
    speedRef.current = speed
    pausedRef.current = paused
    readyRef.current = onReady
  }, [speed, paused, onReady])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2", {
      premultipliedAlpha: false,
      antialias: false,
      powerPreference: "high-performance",
    })
    if (!gl) {
      setError("WebGL2 not available")
      return
    }

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(sh) || "compile error")
      }
      return sh
    }

    let prog: WebGLProgram
    try {
      prog = gl.createProgram()!
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc))
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog) || "link error")
      }
    } catch (e) {
      setError("Shader error:\n" + (e instanceof Error ? e.message : String(e)))
      return
    }

    gl.useProgram(prog)

    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, "u_res")
    const uTime = gl.getUniformLocation(prog, "u_time")

    const resize = () => {
      const dpr = Math.max(1, Math.min(1.5, window.devicePixelRatio || 1))
      const scale = Math.max(0.3, Math.min(1, scaleRef.current))
      const w = Math.max(1, Math.floor((canvas.clientWidth || window.innerWidth) * dpr * scale))
      const h = Math.max(1, Math.floor((canvas.clientHeight || window.innerHeight) * dpr * scale))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
        gl.uniform2f(uRes, w, h)
      }
    }
    window.addEventListener("resize", resize, { passive: true })
    resize()

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let reduceMotion = mediaQuery.matches

    let raf = 0
    let elapsed = reduceMotion ? 4 : 0
    let last = performance.now()
    let announced = false

    // Adaptive quality monitoring
    let frameCount = 0
    let frameTimeSum = 0

    const drawFrame = () => {
      gl.uniform1f(uTime, elapsed)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      if (!announced) {
        announced = true
        readyRef.current?.()
      }
    }

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      const frameDuration = now - last
      last = now

      if (!pausedRef.current && !document.hidden && !reduceMotion) {
        // Measure average frame time over ~60 frames
        frameCount++
        frameTimeSum += frameDuration
        if (frameCount >= 60) {
          const avgFrameTime = frameTimeSum / frameCount
          frameCount = 0
          frameTimeSum = 0

          // If average frame time > 24ms, lower renderScale by 0.1 (min 0.3)
          if (avgFrameTime > 24 && scaleRef.current > 0.3) {
            const nextScale = Math.max(0.3, Math.round((scaleRef.current - 0.1) * 10) / 10)
            if (nextScale < scaleRef.current) {
              scaleRef.current = nextScale
              try {
                sessionStorage.setItem("trace_shader_scale", String(nextScale))
              } catch {}
              resize()
            }
          }
        }

        elapsed += dt * speedRef.current
        resize()
        drawFrame()
      }
      raf = requestAnimationFrame(loop)
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reduceMotion = e.matches
      if (reduceMotion) {
        drawFrame()
      }
    }
    mediaQuery.addEventListener("change", handleMotionChange)

    if (reduceMotion) {
      drawFrame() // single static frame
    } else {
      raf = requestAnimationFrame(loop)
    }

    const onContextLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      setError("WebGL context lost")
    }
    canvas.addEventListener("webglcontextlost", onContextLost)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      mediaQuery.removeEventListener("change", handleMotionChange)
      canvas.removeEventListener("webglcontextlost", onContextLost)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    }
  }, [])

  return (
    <div className={cn("relative h-full w-full bg-black", className)}>
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />
      {error && (
        // CSS gradient fallback in the same palette; keep the app usable without WebGL2.
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 60% at 30% 30%, rgba(0,229,255,.25), transparent 60%), radial-gradient(60% 60% at 70% 70%, rgba(139,92,246,.30), transparent 60%), #05060A",
          }}
          data-shader-error={error}
        />
      )}
    </div>
  )
}

export { ShaderDemo_ATC as AtcShader }
