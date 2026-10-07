# 6. EXPERIENCE: STAGE BY STAGE (PART B)

## 6.3 Stage 3-5: ANALYZE ZONE (#analyze, AnalyzeZone.tsx)

One container with a typed state machine:
```ts
type Phase = "idle" | "ready" | "processing" | "result" | "error"
```

Transitions animate with `AnimatePresence mode="wait"` (blur + opacity + y). The section has a step indicator `01 UPLOAD → 02 ANALYSE → 03 RESULT` whose active step glows.

### 6.3.1 idle: Dropzone (`components/analyze/Dropzone.tsx`)
- Large rounded dropzone, min-height 420 px, glass surface featuring the 3D `BorderBeam` effect.
- Copy: `"Drop an image here"` / sub: `"or click to browse · JPG, PNG, WebP · up to 8 MB"`.
- Secondary `"Paste from clipboard"` hint (`Ctrl/Cmd + V`) and camera/gallery picker via `<input accept="image/*">`.
- Hover: magnetic icon, beam travels, cursor ring expands.
- Drag-over: border turns solid cyan, background grid warps, icon morphs into a down-arrow, text changes to `"Release to scan"`.
- On drop: the image dissolves into scan lines. Render dropped image to canvas, then animate horizontal slices sliding with staggered delay into preview card (≈700 ms).
- Privacy note: 🔒 *Your image is analysed and not stored.* Under it: *"Only upload images you have the right to check."*
- Validation: MIME in `image/jpeg|png|webp`, size ≤ 8 MB, min dimension 64 px. Friendly inline errors with shake animation and `aria-live="polite"`.

### 6.3.2 ready: Preview (`components/analyze/PreviewCard.tsx`)
- Image in a glass card with `BorderBeam`, max-height 60 vh, `object-contain`, file name, dimensions, size.
- Buttons: `"Analyse image"` (primary, magnetic) and `"Choose another"` (ghost).
- Revoke object URLs on unmount/replace.

### 6.3.3 processing: Proceed Phase Animation (`components/analyze/ProcessingStage.tsx`)
- Must feel purposeful and cinematic, running for at least 3.5 s (never longer than real request plus 600 ms).
- Cyan scanning beam sweeps top to bottom on loop leaving a fading trail, with 3 s high-intensity `BorderBeam`.
- Pixel-grid overlay flickers randomly with cyan/violet cells as decorative HUD motion.
- Faint corner brackets around image that tighten with each loop.
- Rotating status text swapping every ~1.2 s: `EXAMINING TEXTURE PATTERNS`, `CHECKING EDGE CONSISTENCY`, `COMPARING LIGHTING`, `LOOKING FOR GENERATION ARTEFACTS`.
- Indeterminate progress bar (never a fake percentage). Cancel button aborts via `AbortController`.
- Background: shader dims and increases contrast.
- `aria-live="polite"` announces `"Analysing image"` once.

### 6.3.4 result: Results (`components/analyze/ResultPanel.tsx` & `ScoreGauge.tsx`)
- Reveal sequence (≈2 s, staggered):
  - Scan lines resolve; image snaps sharp with thin verdict-coloured outline.
  - `ScoreGauge` (SVG radial, 0 to 100) animates arc with `expoOut`, number counting up in Palatino tabular numbers.
  - Verdict chip + one-sentence plain-language headline:
    - `likely_authentic`: *"No strong signs of manipulation were found."*
    - `suspicious`: *"Some signs of manipulation were found. Treat this image with caution."*
    - `likely_manipulated`: *"This image shows strong signs of manipulation."*
  - Confidence indicator and human-readable bullets from API/provider details.
  - Mandatory disclaimer: *"This is an automated assessment, not legal proof. Detection tools can be wrong, especially on compressed or heavily edited images."*
- Fused Forensic Heatmap Panel (`ForensicsPanel.tsx`):
  - Gated behind "Show anyway" when verdict is `likely_authentic`.
  - Multi-cue tabs: Fused, ELA, Noise, Sharpness, JPEG ghost, Face, ML (if enabled), Frequency, Histograms, Metadata.
  - Interactive comparison slider and clickable region list with confidence badges.
- Next Steps Panel (`components/analyze/NextSteps.tsx`):
  - Preserve evidence (screenshots, links, timestamps).
  - Report: `tel:1930` or `cybercrime.gov.in`.
  - Intimate images: `StopNCII.org`.
  - Minors involved: `tel:1098` (Childline).
  - Mental health: `tel:14416` (Tele-MANAS) or `tel:112` (Emergency).
- Actions: `"Check another image"`, `"Ask ADRIA about this result"` (handoff with result summary), `"Copy summary"` (writes text via `navigator.clipboard.writeText`).

---

## 6.4 Stage 6: ABOUT (`components/about/AboutSection.tsx`) & FOOTER

### About Section
- Eyebrow: `ABOUT TRACE`.
- Headline: `"Built to see what's hidden."`
- Body (verbatim):
  > "TRACE is a project by Chethana Poorvi K N, P. Harshini Reddy, P. Omsai Reddy, and Pavan Tej R, built to explore and understand the hidden details in digital images."
- Four glass team cards in a responsive grid, each with 3D `BorderBeam` and pointer tilt:
  - `Chethana Poorvi K N` (CP)
  - `P. Harshini Reddy` (HR)
  - `P. Omsai Reddy` (OR)
  - `Pavan Tej R` (PT)
- Wrapping on small screens without truncation; no invented roles or bios.

### Footer
- Wordmark, © {year} TRACE, privacy modal, helpline references, and smooth back-to-top button.
