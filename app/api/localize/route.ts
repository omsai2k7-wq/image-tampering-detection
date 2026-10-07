import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { validateImageBuffer } from "@/lib/validate"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const serviceUrl = process.env.FORENSICS_SERVICE_URL?.trim()
    const serviceToken = process.env.FORENSICS_SERVICE_TOKEN?.trim()

    // 1. Silent classical fallback if service is not configured
    if (!serviceUrl || !serviceToken) {
      return NextResponse.json(
        {
          available: false,
          fallback: true,
          message: "ML service disabled; using client-side classical fusion.",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      )
    }

    // 2. Client IP & Rate Limiting
    const forwarded = req.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1"
    const rateLimit = checkRateLimit(ip, 10, 60_000)

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please wait a moment and try again.",
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "Cache-Control": "no-store",
          },
        }
      )
    }

    // 3. Parse Multipart Form
    const formData = await req.formData()
    const file = formData.get("image")

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        {
          error: {
            code: "MISSING_IMAGE",
            message: "An image file is required in the 'image' field.",
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      )
    }

    // 4. Validate Bytes & Magic Signature
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const validation = validateImageBuffer(buffer)

    if (!validation.valid && validation.error) {
      return NextResponse.json(
        {
          error: {
            code: validation.error.code,
            message: validation.error.message,
          },
        },
        {
          status: validation.error.status,
          headers: { "Cache-Control": "no-store" },
        }
      )
    }

    // 5. Proxy to Python ML service with 30s timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    try {
      const upstreamFormData = new FormData()
      const blob = new Blob([buffer], { type: validation.mime || "image/jpeg" })
      upstreamFormData.append("image", blob, "image.jpg")

      const url = `${serviceUrl.replace(/\/+$/, "")}/localize`
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceToken}`,
        },
        body: upstreamFormData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        console.warn(`[api/localize] Upstream service returned status ${res.status}`)
        return NextResponse.json(
          {
            available: false,
            fallback: true,
            message: "ML service error; falling back to classical fusion.",
          },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        )
      }

      const mlData = await res.json()
      return NextResponse.json(
        {
          available: true,
          score: mlData.score,
          mapPngBase64: mlData.mapPngBase64,
          model: mlData.model,
          version: mlData.version,
          elapsedMs: mlData.elapsedMs,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      )
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      console.warn("[api/localize] ML service failed or timed out:", err instanceof Error ? err.message : err)
      return NextResponse.json(
        {
          available: false,
          fallback: true,
          message: "ML service timed out; falling back to classical fusion.",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      )
    }
  } catch (error) {
    console.error("[api/localize] Request error:", error)
    return NextResponse.json(
      {
        available: false,
        fallback: true,
        message: "Internal error; falling back to classical fusion.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  }
}
