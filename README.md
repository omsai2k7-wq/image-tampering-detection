<<<<<<< HEAD
# TRACE — Every Edit Leaves a Trace

> **Cinematic, private, and accessible digital image forensics for everyone.**

TRACE is a single-page web application designed to help ordinary people verify whether an image has been morphed, face-swapped, or AI-generated. Built with a calm, protective tone, TRACE delivers automated likelihood scores in plain language, paired with an upgraded multi-cue forensic heatmap and actionable next steps for individuals facing digital extortion, blackmail, or misinformation.

---

## 1. Quick Start

### Prerequisites
- Node.js 20+ (recommended: Node 20 or 22 LTS)
- Python 3.10+ (optional, only required if self-hosting the ML localization microservice)

### Installation
```bash
# 1. Clone repository and install dependencies
npm install --legacy-peer-deps

# 2. Fetch and verify self-hosted MediaPipe models & WASM runtimes
npm run fetch-models

# 3. Configure local environment variables
cp .env.example .env.local

# 4. Start local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## 2. Environment Configuration

All environment variables are declared in `.env.example` and can be set in `.env.local`:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `DETECTION_PROVIDER` | `mock` | Active detection engine: `mock` (offline deterministic) or `sightengine`. |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | Displays the non-intrusive demo badge in the UI during offline/mock operation. |
| `SIGHTENGINE_API_USER` | `""` | User ID for Sightengine Deepfake / GenAI detection API (server-side only). |
| `SIGHTENGINE_API_SECRET` | `""` | Secret key for Sightengine API (server-side only). |
| `ANTHROPIC_API_KEY` | `""` | API key for ADRIA multilingual assistant via Anthropic SDK (server-side only). |
| `ADRIA_MODEL` | `claude-3-5-sonnet-20241022` | Model identifier used for ADRIA streaming responses. |
| `FORENSICS_SERVICE_URL` | `""` | URL to optional Python ML localization service (e.g. `http://localhost:8000`). |
| `FORENSICS_SERVICE_TOKEN` | `""` | Bearer token for server-to-server ML service communication. |
| `NEXT_PUBLIC_FORENSICS_SERVICE_ENABLED` | `false` | Client-facing flag to enable ML disclaimer disclosure copy in the footer. |

*Note: All secret keys remain strictly isolated on the Next.js backend (`app/api/*`). No API keys or raw user images ever leak to client bundles, logs, or third-party trackers.*

---

## 3. How to Swap Detection Providers

TRACE utilizes a unified `DetectionProvider` interface located in [`lib/detection/types.ts`](file:///c:/Users/omsai/OneDrive/Attachments/TRACE-0/lib/detection/types.ts):

```typescript
export interface DetectionProvider {
  readonly name: string
  analyze(file: Buffer, mime: string, signal?: AbortSignal): Promise<DetectionResult>
}
```

To integrate a new provider (e.g. Hive, Reality Defender, or a custom vision model):
1. Create a new adapter file in `lib/detection/providers/<provider_name>.ts` implementing `DetectionProvider`.
2. Map the vendor score to a normalized `0..1` range using [`lib/detection/normalize.ts`](file:///c:/Users/omsai/OneDrive/Attachments/TRACE-0/lib/detection/normalize.ts).
3. In [`app/api/analyze/route.ts`](file:///c:/Users/omsai/OneDrive/Attachments/TRACE-0/app/api/analyze/route.ts), register the new provider under the `getProvider()` switch statement.
4. Set `DETECTION_PROVIDER=<provider_name>` in `.env.local`.

---

## 4. How to Add a Language to ADRIA

ADRIA supports 8 Indian languages out-of-the-box (English, Hindi, Telugu, Kannada, Tamil, Malayalam, Bengali, Marathi). To add a new language:
1. Open [`lib/adria/languages.ts`](file:///c:/Users/omsai/OneDrive/Attachments/TRACE-0/lib/adria/languages.ts).
2. Append a new language definition to `SUPPORTED_LANGUAGES`:
   ```typescript
   {
     code: "gu",
     label: "Gujarati",
     nativeLabel: "ગુજરાતી",
     speechLang: "gu-IN"
   }
   ```
3. ADRIA's UI selector and Web Speech API recognition/speechSynthesis automatically incorporate the new language entry.

---

## 5. Forensics Pipeline Architecture

The TRACE forensic inspection suite operates on a multi-cue, fused client-server pipeline:

1. **Error Level Analysis (ELA):** Recompresses the image at $q = 90$ and normalizes differences against local gradient magnitude ($7 \times 7$ window + $\epsilon = 0.08$) to prevent natural high-contrast edges and text from dominating the heatmap.
2. **Noise Residual Analysis:** Luminance variance is extracted across $16 \times 16$ blocks from a $3 \times 3$ median residual, normalized via robust block Median/MAD $z$-scores, and bilinearly upsampled.
3. **Sharpness Inconsistency:** Laplacian variance is evaluated over $32 \times 32$ blocks using log-variance transforms and robust $z$-scoring.
4. **JPEG Ghost Detection:** Sweeps recompression qualities $55 \dots 95$ across $16 \times 16$ blocks to locate minimum difference qualities and map deviations from the dominant mode (automatically bypassed for PNG inputs).
5. **Face-Aware Forensics:** Detects up to 3 faces with MediaPipe's 478-landmark model. Evaluates internal facial features and analyzes a 24-segment radial seam boundary between inner and outer face bands to catch blending artifacts.
6. **Multi-Cue Fusion:** Combines cue maps via weighted average and agreement consistency, followed by Gaussian smoothing ($\sigma \approx 1.5\%$ shorter dimension) and dual-hysteresis thresholding (seed $0.70$, grow $0.50$). Vector contours are simplified using the Douglas-Peucker algorithm.
7. **Educational 2D FFT:** Displays a center-shifted Radix-2 Cooley-Tukey 2D FFT spectrum with Hann windowing for visual inspection of synthetic grid artifacts.

---

## 6. Optional Python ML Microservice

An optional stateless FastAPI service is provided in `forensics-service/` for hosting deep spatial-frequency localization models:

```bash
cd forensics-service
pip install -r requirements.txt
export FORENSICS_SERVICE_TOKEN="your-secure-token"
uvicorn main:app --host 0.0.0.0 --port 8000
```

Alternatively, run via Docker:
```bash
cd forensics-service
docker build -t trace-forensics-service .
docker run -p 8000:8000 -e FORENSICS_SERVICE_TOKEN="your-secure-token" trace-forensics-service
```
Configure `FORENSICS_SERVICE_URL=http://localhost:8000` and `FORENSICS_SERVICE_TOKEN=your-secure-token` in TRACE's `.env.local`.

---

## 7. Testing & Evaluation

Run unit and integration test suites:
```bash
# Run unit tests
npm test

# Run synthetic forensics evaluation harness (30 synthetic cases + 20 clean images)
npm run eval

# Run ESLint validation
npm run lint

# Run production build
npm run build
```

---

## 8. Limitations & Ethical Notice

- **Probabilities, Not Legal Proof:** TRACE computes automated statistical likelihoods. Outputs should not be treated as absolute proof in legal proceedings.
- **Social Media Compression:** Repeated compression (e.g., WhatsApp, Telegram, Instagram) smooths high-frequency sensor noise and quantization artifacts, which may alter forensic cues.
- **Privacy Guarantee:** Images are processed in volatile memory and never stored on disk or logged. Raw images are discarded upon analysis completion.
- **Emergency Resources:** If you are experiencing extortion, harassment, or non-consensual image manipulation:
  - **National Cybercrime Helpline:** [1930](tel:1930) | [cybercrime.gov.in](https://cybercrime.gov.in)
  - **Non-Consensual Intimate Imagery:** [StopNCII.org](https://stopncii.org)
  - **Child Helpline:** [1098](tel:1098)
  - **Mental Health Crisis Support (Tele-MANAS):** [14416](tel:14416) | Emergency: [112](tel:112)

---

## 9. Team

TRACE was built by:
- **Chethana Poorvi K N** (CP)
- **P. Harshini Reddy** (HR)
- **P. Omsai Reddy** (OR)
- **Pavan Tej R** (PT)
=======
# image-tampering-detection
>>>>>>> 10bbfa9d4e128807458fe203ee7fdaa8c4f882d4
