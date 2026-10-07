import crypto from "crypto"
import { DetectionProvider, DetectionResult } from "../types"
import { scoreToLabel, calculateConfidence } from "../normalize"

export class MockDetectionProvider implements DetectionProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyze(file: Buffer, mime: string): Promise<DetectionResult> {
    // Deterministic hash of the file bytes
    const hash = crypto.createHash("sha256").update(file).digest("hex")
    const hashInt = parseInt(hash.slice(0, 8), 16)

    // Normalize to 0.05 ... 0.95 range
    const score = Number(((hashInt % 91 + 5) / 100).toFixed(2))
    const label = scoreToLabel(score)
    const confidence = calculateConfidence(score)

    const details = []
    if (label === "likely_authentic") {
      details.push(
        {
          id: "sensor_noise",
          text: "Camera sensor noise distribution and high-frequency patterns appear consistent throughout the image.",
        },
        {
          id: "lighting_consistency",
          text: "Illumination angles and specular highlights match across prominent focal surfaces.",
        },
        {
          id: "compression_profile",
          text: "Discrete cosine transform (DCT) artifacts are uniform, with no signs of secondary splicing.",
        }
      )
    } else if (label === "suspicious") {
      details.push(
        {
          id: "boundary_discontinuity",
          text: "Subtle frequency anomalies detected around facial and foreground contours.",
        },
        {
          id: "resampling_trace",
          text: "Traces of localized image resampling or sharpening detected in secondary regions.",
        },
        {
          id: "compression_mismatch",
          text: "Differing compression matrices suggest possible multi-source compositing.",
        }
      )
    } else {
      details.push(
        {
          id: "synthetic_generation",
          text: "Structural latent-space patterns characteristic of generative diffusion or GAN synthesis detected.",
        },
        {
          id: "facial_warping",
          text: "Biometric landmark asymmetry and blending seam boundaries consistent with face-swapping algorithms.",
        },
        {
          id: "texture_inconsistency",
          text: "Unnatural micro-texture smoothing found across skin surfaces and hair strands.",
        }
      )
    }

    return {
      requestId: crypto.randomUUID(),
      score,
      label,
      confidence,
      details,
      provider: "mock",
      processedAt: new Date().toISOString(),
    }
  }
}
