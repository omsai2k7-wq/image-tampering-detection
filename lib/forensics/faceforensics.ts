import {
  rgbToYCbCr,
  computePercentile,
  clamp,
} from "./image-utils"
import { FaceForensics, FacialPartAnomaly } from "./types"
import { ImageBuffer } from "./ela"

// MediaPipe 478 face landmark oval contour indices
export const FACE_OVAL_LANDMARKS = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109,
]

export const LEFT_EYE_LANDMARKS = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
export const RIGHT_EYE_LANDMARKS = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
export const NOSE_LANDMARKS = [1, 2, 98, 327, 168, 6, 197, 195, 5]
export const LIPS_LANDMARKS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]

import type { FaceLandmarker } from "@mediapipe/tasks-vision"

let faceLandmarkerInstance: FaceLandmarker | null = null

/**
 * Initialize MediaPipe FaceLandmarker with self-hosted assets under /mediapipe/
 */
export async function getFaceLandmarker() {
  if (typeof window === "undefined") return null
  if (faceLandmarkerInstance) return faceLandmarkerInstance

  try {
    const vision = await import("@mediapipe/tasks-vision")
    const wasmFileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm")
    faceLandmarkerInstance = await vision.FaceLandmarker.createFromOptions(wasmFileset, {
      baseOptions: {
        modelAssetPath: "/mediapipe/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numFaces: 3,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
    })
    return faceLandmarkerInstance
  } catch (err) {
    console.warn("FaceLandmarker GPU init failed, trying CPU fallback:", err)
    try {
      const vision = await import("@mediapipe/tasks-vision")
      const wasmFileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm")
      faceLandmarkerInstance = await vision.FaceLandmarker.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetPath: "/mediapipe/face_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        numFaces: 3,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
      })
      return faceLandmarkerInstance
    } catch (e) {
      console.warn("Could not initialize FaceLandmarker:", e)
      return null
    }
  }
}

/**
 * Perform Face-Aware forensics
 * Analyzes up to 3 faces, extracts facial parts & 24-segment blend boundary
 */
export async function analyzeFaceForensics(
  image: ImageBuffer,
  cueMaps?: {
    ela?: Float32Array
    noise?: Float32Array
    sharpness?: Float32Array
    ghost?: Float32Array
  },
  detectedLandmarks?: Array<{ x: number; y: number; z?: number }>
): Promise<FaceForensics> {
  const { width, height, data } = image

  let landmarks = detectedLandmarks
  if (!landmarks) {
    const landmarker = await getFaceLandmarker()
    if (landmarker && typeof document !== "undefined") {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          const imgData = new ImageData(new Uint8ClampedArray(data), width, height)
          ctx.putImageData(imgData, 0, 0)
          const result = landmarker.detect(canvas)
          if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
            landmarks = result.faceLandmarks[0] // Dominant face
          }
        }
      } catch (err) {
        console.warn("Error running FaceLandmarker on canvas:", err)
      }
    }
  }

  // If no face found
  if (!landmarks || landmarks.length === 0) {
    return {
      detected: false,
      regions: [],
      boundarySegments: new Array(24).fill(0),
      boundaryScore: 0,
      summary: "No face detected; analysing the whole image only.",
      note: "No facial oval detected by the landmark model.",
    }
  }

  // 1. Calculate Face Bounding Box
  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0

  for (const pt of landmarks) {
    if (pt.x < minX) minX = pt.x
    if (pt.x > maxX) maxX = pt.x
    if (pt.y < minY) minY = pt.y
    if (pt.y > maxY) maxY = pt.y
  }

  const boxW = Math.max(0.01, maxX - minX)
  const boxH = Math.max(0.01, maxY - minY)
  const box: [number, number, number, number] = [
    clamp(minX, 0, 1),
    clamp(minY, 0, 1),
    clamp(boxW, 0, 1),
    clamp(boxH, 0, 1),
  ]

  // 2. 24-Segment Blend Boundary Discontinuity
  // Split oval contour into 24 arc segments
  const boundarySegments: number[] = new Array(24).fill(0)
  const ovalPts = FACE_OVAL_LANDMARKS.map((idx) => landmarks![idx] || { x: 0.5, y: 0.5 })
  const numOval = ovalPts.length

  // Band width = ~4% of face width in pixels
  const bandDistPx = Math.max(2, Math.round(boxW * width * 0.04))

  for (let s = 0; s < 24; s++) {
    // Select subset of oval points corresponding to segment s
    const startIdx = Math.floor((s / 24) * numOval)
    const endIdx = Math.floor(((s + 1) / 24) * numOval)

    let innerCb = 0, innerCr = 0, outerCb = 0, outerCr = 0
    let innerNoise = 0, outerNoise = 0
    let innerSharp = 0, outerSharp = 0
    let innerEla = 0, outerEla = 0
    let count = 0

    const faceCenterX = (minX + maxX) / 2 * width
    const faceCenterY = (minY + maxY) / 2 * height

    for (let k = startIdx; k <= endIdx; k++) {
      const pt = ovalPts[k % numOval]
      const px = pt.x * width
      const py = pt.y * height

      // Vector from center to oval point
      const dx = px - faceCenterX
      const dy = py - faceCenterY
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const nx = dx / len
      const ny = dy / len

      // Inner band sample
      const inX = Math.round(clamp(px - nx * bandDistPx, 0, width - 1))
      const inY = Math.round(clamp(py - ny * bandDistPx, 0, height - 1))
      const inIdx = (inY * width + inX) * 4
      const inPixelIdx = inY * width + inX

      // Outer band sample
      const outX = Math.round(clamp(px + nx * bandDistPx, 0, width - 1))
      const outY = Math.round(clamp(py + ny * bandDistPx, 0, height - 1))
      const outIdx = (outY * width + outX) * 4
      const outPixelIdx = outY * width + outX

      const [, inCbVal, inCrVal] = rgbToYCbCr(data[inIdx], data[inIdx + 1], data[inIdx + 2])
      const [, outCbVal, outCrVal] = rgbToYCbCr(data[outIdx], data[outIdx + 1], data[outIdx + 2])

      innerCb += inCbVal
      innerCr += inCrVal
      outerCb += outCbVal
      outerCr += outCrVal

      if (cueMaps?.noise) {
        innerNoise += cueMaps.noise[inPixelIdx] || 0
        outerNoise += cueMaps.noise[outPixelIdx] || 0
      }
      if (cueMaps?.sharpness) {
        innerSharp += cueMaps.sharpness[inPixelIdx] || 0
        outerSharp += cueMaps.sharpness[outPixelIdx] || 0
      }
      if (cueMaps?.ela) {
        innerEla += cueMaps.ela[inPixelIdx] || 0
        outerEla += cueMaps.ela[outPixelIdx] || 0
      }

      count++
    }

    if (count > 0) {
      innerCb /= count; innerCr /= count; outerCb /= count; outerCr /= count
      innerNoise /= count; outerNoise /= count
      innerSharp /= count; outerSharp /= count
      innerEla /= count; outerEla /= count

      // Compute normalized differences
      const dColor = Math.sqrt((innerCb - outerCb) ** 2 + (innerCr - outerCr) ** 2) / 64
      const dNoise = Math.abs(innerNoise - outerNoise)
      const dSharp = Math.abs(innerSharp - outerSharp)
      const dEla = Math.abs(innerEla - outerEla)

      // Combined discontinuity score 0..1
      const segScore = clamp(0.35 * dColor + 0.25 * dNoise + 0.20 * dSharp + 0.20 * dEla, 0, 1)
      boundarySegments[s] = segScore
    }
  }

  // 75th percentile of segments
  const boundaryScore = computePercentile(boundarySegments, 75)

  // 3. Facial Part Anomaly Scores
  const partDefs = [
    { name: "face_oval" as const, landmarks: FACE_OVAL_LANDMARKS },
    { name: "left_eye" as const, landmarks: LEFT_EYE_LANDMARKS },
    { name: "right_eye" as const, landmarks: RIGHT_EYE_LANDMARKS },
    { name: "nose" as const, landmarks: NOSE_LANDMARKS },
    { name: "lips" as const, landmarks: LIPS_LANDMARKS },
  ]

  const regions: FacialPartAnomaly[] = partDefs.map((p) => {
    let elaSum = 0, noiseSum = 0, sharpSum = 0, ghostSum = 0, n = 0
    for (const lIdx of p.landmarks) {
      const pt = landmarks![lIdx]
      if (pt) {
        const x = Math.round(clamp(pt.x * width, 0, width - 1))
        const y = Math.round(clamp(pt.y * height, 0, height - 1))
        const idx = y * width + x
        if (cueMaps?.ela) elaSum += cueMaps.ela[idx] || 0
        if (cueMaps?.noise) noiseSum += cueMaps.noise[idx] || 0
        if (cueMaps?.sharpness) sharpSum += cueMaps.sharpness[idx] || 0
        if (cueMaps?.ghost) ghostSum += cueMaps.ghost[idx] || 0
        n++
      }
    }

    const ela = n > 0 ? elaSum / n : 0
    const noise = n > 0 ? noiseSum / n : 0
    const sharpness = n > 0 ? sharpSum / n : 0
    const ghost = n > 0 ? ghostSum / n : 0

    // Robust anomaly against nominal baseline
    const anomalyScore = clamp(0.3 * ela + 0.3 * noise + 0.2 * sharpness + 0.2 * ghost, 0, 1)

    return {
      name: p.name,
      anomalyScore,
      cues: {
        ela,
        noise,
        sharpness,
        ghost,
      },
    }
  })

  // 4. Hedged Rule-based Summary
  let summary = "Facial texture and boundary features appear consistent with the surrounding scene."
  if (boundaryScore >= 0.65) {
    summary = "Blend boundary discontinuity is noticeable around the facial contour, indicating possible localized insertion or edge blending."
  } else if (boundaryScore >= 0.45) {
    summary = "Subtle variance observed between facial perimeter and background tones; treat with careful inspection."
  }

  return {
    detected: true,
    box,
    landmarksCount: landmarks.length,
    regions,
    boundarySegments,
    boundaryScore,
    summary,
  }
}
