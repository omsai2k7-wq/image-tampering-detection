7. DETECTION API (REST) AND API KEY HANDLING
7.1 Security architecture (non-negotiable)
Browser ──multipart──▶ POST /api/analyze (Next.js Route Handler, server only)
                              │  reads secrets from process.env
                              ▼
                        Detection provider REST API
The browser never sees the provider key. No NEXT_PUBLIC_ secrets. No keys in client bundles, git, logs, error messages, or URLs.
Secrets live in .env.local (git-ignored). Commit only .env.example with empty values (Appendix B).
Route handlers export export const runtime = "nodejs" and export const dynamic = "force-dynamic".
Add a quick check script or CI step that greps the build output for key-like strings.
7.2 /api/analyze contract

Request: POST multipart/form-data, field image (File).

Server steps

Rate limit per IP (lib/rate-limit.ts): e.g. 10 requests / minute. In-memory Map for development; note in a comment that production should use a shared store (e.g. Upstash Redis). Return 429 with Retry-After.
Validate: size ≤ MAX_UPLOAD_MB; MIME in image/jpeg|png|webp; verify magic bytes (don't trust the declared type); reject otherwise with 415 or 413.
Call the provider through an adapter (lib/detection/providers/*), with a 30 s AbortController timeout.
Normalize the provider response into DetectionResult.
Do not persist the image: keep it in memory only, never write to disk or logs. Respond with Cache-Control: no-store.
Return JSON.

Response shape

ts
type Label = "likely_authentic" | "suspicious" | "likely_manipulated"

interface DetectionResult {
  requestId: string                // uuid
  score: number                    // 0..1 manipulation likelihood
  label: Label
  confidence: "low" | "medium" | "high"
  details: { id: string; text: string }[]   // plain-language reasons
  heatmapUrl?: string              // only if provider supplies one
  provider: string
  processedAt: string              // ISO
}

Label mapping (normalize.ts, thresholds are constants and configurable): score < 0.35 → likely_authentic; 0.35-0.65 → suspicious; > 0.65 → likely_manipulated. Confidence: high when score ≤ 0.15 or ≥ 0.85; medium when ≤ 0.3 or ≥ 0.7; else low.

Error responses: { error: { code, message } } with accurate HTTP statuses (400, 413, 415, 429, 502, 504). Messages must be safe to show to users and must never contain provider internals.

7.3 Provider adapter

Implement a DetectionProvider interface: analyze(file: Buffer, mime: string, signal: AbortSignal): Promise<DetectionResult>.

sightengine.ts (default real provider): POST multipart to the Sightengine check endpoint with media, models set to the deepfake and/or AI-generated image models, plus api_user and api_secret from env. Map the returned scores (take the maximum relevant manipulation score) into score. Verify the current endpoint, model names, response fields, pricing, and free-tier limits in the provider's official docs before coding the mapping, because these change. Isolate every provider-specific field name in this file.
mock.ts: deterministic fake results for offline development, selected by DETECTION_PROVIDER=mock. Derive the score from a hash of the file bytes so the same image always gives the same output, and include varied details. Show a small DEMO MODE badge in the UI whenever the mock provider is active (expose via a non-secret NEXT_PUBLIC_DEMO_MODE=true).
Easy to add Hive, Reality Defender, or a self-hosted model later by adding a file and switching DETECTION_PROVIDER.
7.4 Client hook (hooks/useAnalyze.ts)

fetch("/api/analyze", { method: "POST", body: FormData, signal }), typed with zod parsing of the response, AbortController for cancel/timeout, returns { run, cancel, status, result, error }. Enforce the minimum processing animation time (§6.3.3) in the UI layer, not by delaying the request.


## Appendix B: .env.example
```
# Detection provider: "mock" (offline dev) or "sightengine" (production)
DETECTION_PROVIDER=mock
NEXT_PUBLIC_DEMO_MODE=true

# Sightengine credentials
SIGHTENGINE_API_USER=
SIGHTENGINE_API_SECRET=

# Anthropic API credentials
ANTHROPIC_API_KEY=
ADRIA_MODEL=claude-3-5-sonnet-20241022
```

## Appendix C: Detection Provider Specification
- Sightengine Endpoint: `https://api.sightengine.com/1.0/check.json`
- Method: `POST` multipart/form-data
- Parameters: `media`, `models=genai,deepfake`, `api_user`, `api_secret`
- Extraction: `max(type.ai_generated, type.deepfake)` mapped to 0..1 score
- Safe fallback: Mock provider offline deterministic hashing based on image bytes.