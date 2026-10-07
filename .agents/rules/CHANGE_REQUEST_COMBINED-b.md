# TRACE Change Request: Part 2 — Fused Forensic Heatmap Upgrade

Upgrade the Forensic Heatmap so it highlights regions of an image most likely to be manipulated, using a technically sound, multi-cue pipeline.

## A. Cue Maps (`lib/forensics/`)
Each cue returns a normalised `Float32Array` map (0..1) at the analysed size (longest side capped at 2048; JPEG-ghost capped at 1024). Return `coveragePct`, `mean`, `p95`.
1. **ELA (`ela.ts`):** JPEG recompress at q90, per-pixel absolute diff (max over RGB), amplify, blur radius 2, normalise by 99.5th percentile. Edge-aware normalisation: divide by (local gradient magnitude averaged over 7x7 + epsilon = 0.08) so natural high-contrast edges do not dominate. Mask saturated pixels (<=3 or >=252).
2. **Noise Residual (`noise.ts`):** Luminance minus 3x3 median copy, variance per 16x16 block, robust z-score (median/MAD over valid blocks), |z| clipped 0..4 to 0..1, bilinear upsample.
3. **Sharpness (`sharpness.ts`):** Laplacian variance per 32x32 block, log(1+v), robust z-score (median/MAD), 0..1, bilinear upsample.
4. **JPEG Ghost (`ghost.ts`):** Recompress at qualities 55..95 step 5; compute per-pixel squared difference, box-average over 16x16 blocks; per block find quality with minimum difference (ghost quality). Compute dominant ghost quality over image (mode of argmin histogram). Map is normalised deviation from dominant mode weighted by minimum clarity. For PNG input, skip and mark "Not applicable".
5. **Frequency (`fft.ts`):** Radix-2 2D FFT magnitude spectrum with Hann window. Stays an educational card, NOT part of numerical fusion.

---

## B. Face-Aware Forensics (`lib/forensics/faceforensics.ts`)
- Use `@mediapipe/tasks-vision` FaceLandmarker (478 landmarks) with self-hosted WASM and `face_landmarker.task` model under `/public/mediapipe/`. `npm run fetch-models` downloads them from official sources. No runtime external calls.
- Detect up to 3 faces. If none found, display "No face detected; analysing the whole image only".
- Rasterise masks from landmark constants: face oval, left eye, right eye, nose, lips, plus boundary ring (inner & outer band ~4% face width on either side of oval contour).
- Background reference = pixels outside face oval dilated by 8%, excluding saturated and high-gradient pixels.
- Region anomaly score for each facial part = robust |z| of its mean (noise variance, Laplacian variance, ELA, ghost deviation) versus background reference distribution.
- **Blend-Boundary Discontinuity:** Split oval contour into 24 arc segments. For each segment, compare inner and outer band: difference in mean Cb & Cr, noise variance, sharpness, and ELA. Robustly normalise into one 0..1 discontinuity score.

---

## C. Multi-Cue Fusion Engine (`lib/forensics/fusion.ts`, `regions.ts`)
- Combine valid cue maps: Weighted mean (ELA: 0.30, Noise: 0.25, Ghost: 0.20, Sharpness: 0.15, ML: 0.10 if available).
- Compute Agreement Map: fraction of cues > 0.60 per pixel.
- Fused = 0.60 * WeightedMean + 0.40 * AgreementMap.
- Gaussian smoothing with sigma ~ 1.5% of shorter dimension.
- Face amplification: multiply by 1.15 inside face oval and boundary ring if face anomalies detected.
- Dual hysteresis thresholding: High threshold 0.70 (seed), Low threshold 0.50 (grow).
- Connected component extraction with minimum area (0.5% image size) and maximum area (50% image size).
- Douglas-Peucker polygon simplification to produce smooth SVG vector outlines with bounding boxes and confidence scores.

---

## D. UI & Validation Harness
- `ForensicsPanel.tsx`: Gated behind "Show anyway" when verdict is `likely_authentic`. Tabs for Fused, ELA, Noise, Sharpness, Ghost, Face, Frequency, Histograms, Metadata. Comparison slider between original and heatmap.
- `RegionList.tsx`: Interactive list of flagged regions with confidence, area, and primary cue triggers. Clicking focuses the region in the viewer.
- `tests/forensics.test.ts`: Vitest suite verifying clean images have no flagged regions, splices have IoU > 0.20, blur/resize produce detectable anomalies, and PNG inputs mark ghost as N/A.
- `scripts/eval/run-eval.ts`: Evaluation harness over 30 synthetic tamper cases and 20 untouched images.
