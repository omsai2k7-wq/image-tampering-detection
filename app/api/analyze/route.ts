import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { validateImageBuffer } from "@/lib/validate"
import { MockDetectionProvider } from "@/lib/detection/providers/mock"
import { SightengineDetectionProvider } from "@/lib/detection/providers/sightengine"
import { DetectionProvider } from "@/lib/detection/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getProvider(): DetectionProvider {
  const providerName = (process.env.DETECTION_PROVIDER || "mock").toLowerCase().trim()
  if (providerName === "sightengine") {
    return new SightengineDetectionProvider()
  }
  return new MockDetectionProvider()
}

export async function POST(req: NextRequest) {
  try {
    // 1. Client IP & Rate Limiting
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

    // 2. Parse Multipart Form
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

    // 3. Convert to Buffer & Validate
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

    // 4. Provider Execution with 30s timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    try {
      const provider = getProvider()
      const result = await provider.analyze(
        buffer,
        validation.mime || "image/jpeg",
        controller.signal
      )
      clearTimeout(timeoutId)

      return NextResponse.json(result, {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      })
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          {
            error: {
              code: "TIMEOUT",
              message: "Analysis request timed out after 30 seconds.",
            },
          },
          { status: 504, headers: { "Cache-Control": "no-store" } }
        )
      }

      console.error("[api/analyze] Provider execution error:", err instanceof Error ? err.message : err)
      return NextResponse.json(
        {
          error: {
            code: "PROVIDER_ERROR",
            message: "Detection provider encountered an error. Please try again shortly.",
          },
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      )
    }
  } catch (error) {
    console.error("[api/analyze] Request error:", error)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error occurred while processing image.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
