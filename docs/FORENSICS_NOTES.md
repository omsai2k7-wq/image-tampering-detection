# TRACE Forensics Pipeline: Technical Specification & Validation Notes

## 1. Overview & Architecture

The TRACE Forensics Pipeline is a multi-cue, client-orchestrated forensic inspection engine designed to highlight candidate regions of image manipulation without altering server-side detection probability scores.

```
Uploaded Image (JPEG / PNG / WebP)
    │
    ├─▶ Error Level Analysis (ELA) [q90 recompression diff, edge-suppression]
    ├─▶ Noise Residual Analysis [3x3 median copy, 16x16 block MAD z-score]
    ├─▶ Sharpness Variance [3x3 Laplacian, 32x32 block log-var z-score]
    ├─▶ JPEG Ghost Analysis [55..95 quality sweep, argmin mode deviation]
    ├─▶ Educational 2D FFT Spectrum [Radix-2 Cooley-Tukey, Hann window]
    ├─▶ Face-Aware Forensics [MediaPipe 478 landmarks, 24-segment seam meter]
    └─▶ (Optional) ML Localizer [Python FastAPI service, spatial-freq attention]
            │
            ▼
      Multi-Cue Fusion Engine
      - Weighted Mean (ELA: 0.30, Noise: 0.25, Ghost: 0.20, Sharpness: 0.15)
      - Agreement Map (fraction of cues > 0.60)
      - Fused = 0.6 * WeightedMean + 0.4 * Agreement Map
      - Gaussian Smoothing (sigma ~ 1.5% shorter dimension)
      - Face Amplification (1.15x inside facial oval/boundary)
      - Dual Hysteresis Thresholding (High: 0.70, Low: 0.50)
      - Connected Component Extraction & Douglas-Peucker Outline Simplification
```

*Note on Reference Notebook:* `docs/colab_reference.ipynb` was not present in the workspace; the pipeline methods, constants, and parameters specified in the Change Request specification were used as the primary foundation.

---

## 2. Cue Implementations & Mathematical Formulations

### 2.1 Error Level Analysis (`lib/forensics/ela.ts`)
- **JPEG Recompression**: Baseline quality $q = 0.90$.
- **Saturation Masking**: Pixels with channel values $\le 3$ or $\ge 252$ are masked to 0 to prevent saturation artifacts.
- **Edge-Aware Normalization**: Raw differences are divided by $(\|\nabla I\|_{7\times 7} + \epsilon)$ with $\epsilon = 0.08$. This prevents high-contrast natural edges, text, and logos from dominating the map.
- **Percentile Normalization**: 99.5th percentile normalization with blur radius $r = 2$.

### 2.2 Noise Residual Analysis (`lib/forensics/noise.ts`)
- **Residual Extraction**: $R(x, y) = I_{\text{lum}}(x, y) - \text{median}_{3\times 3}(I_{\text{lum}})(x, y)$.
- **Block Statistics**: Local variance computed over non-overlapping $16 \times 16$ blocks.
- **Robust Z-Score**:
  $$z_b = \frac{|\text{Var}_b - \text{Median}(\text{Var})|}{1.4826 \cdot \text{MAD}(\text{Var}) + \epsilon}$$
- **Clipping & Upsampling**: $|z|$ clipped to $[0, 4]$, normalized to $[0, 1]$, and bilinearly upsampled to full resolution.

### 2.3 Sharpness Inconsistency (`lib/forensics/sharpness.ts`)
- **Laplacian Filtering**: Standard discrete $3 \times 3$ Laplacian kernel.
- **Block Variance & Log Transform**: Computed over $32 \times 32$ blocks with $\log(1 + \text{Var}_{\text{Lap}})$.
- **Robust Z-Score**: Normalized via block median and MAD, clipped to $[0, 1]$, and bilinearly upsampled.

### 2.4 JPEG Ghost Detection (`lib/forensics/ghost.ts`)
- **Format Gating**: For PNG input, this cue is skipped and flagged as `"Not applicable"`.
- **Quality Sweep**: Recompression differences evaluated across $q \in [55, 60, 65, \dots, 95]$.
- **Ghost Quality Minimization**: Per $16 \times 16$ block, argmin quality $q^*$ and clarity metric $\frac{E_{\text{second}} - E_{\text{min}}}{E_{\text{min}} + \epsilon}$ are calculated.
- **Dominant Mode Deviation**: Normalized absolute distance from the global histogram mode, weighted by clarity. Longest dimension capped at 1024 px.

### 2.5 2D FFT Magnitude Spectrum (`lib/forensics/fft.ts`)
- **Educational Spectrum**: Center-shifted 2D FFT with Hann windowing to visualize artificial periodic grid frequencies and synthetic generation fingerprints. Stays an educational visualization and is excluded from numerical fusion.

### 2.6 Face-Aware Forensics (`lib/forensics/faceforensics.ts`)
- **Model**: MediaPipe FaceLandmarker with 478 landmarks. Assets self-hosted under `/public/mediapipe/`.
- **Blend-Boundary Discontinuity**:
  - Oval contour divided into 24 radial arc segments.
  - Inner and outer bands sampled at $\approx 4\%$ face width.
  - Discontinuity computed by combining $\Delta C_b, \Delta C_r$, noise variance difference, sharpness difference, and ELA difference.
  - Boundary seam score computed as the 75th percentile of segment scores.

---

## 3. Machine-Learning Localizer Research & License Analysis

### Candidate Models Evaluated
1. **TruFor (ECCV 2022)**:
   - *Architecture*: RGB + Noiseprint++ transformer fusion with confidence mapping.
   - *License*: **CC-BY-NC 4.0 (Non-Commercial Research Only)**. Prohibits general production or commercial redistribution without commercial licensing agreements.
2. **CAT-Net (IJCV 2022)**:
   - *Architecture*: End-to-end compression artifact tracing network.
   - *License*: **Non-commercial research only**.
3. **PSCC-Net (CVPR 2021)**:
   - *Architecture*: Progressive spatio-channel correlation network.
   - *License*: **Academic research only**.
4. **MVSS-Net (ICCV 2021)**:
   - *Architecture*: Multi-view multi-scale supervision.
   - *License*: Code is Apache-2.0, but pretrained weights are conditioned on research-restricted benchmark sets (CASIA, Coverage).

### Implementation Strategy
Because all candidate end-to-end deep localization models carry strict non-commercial research restrictions on their published weights, **TRACE ships with a clean classical-first fusion pipeline** and includes a production-grade, documented FastAPI microservice in `forensics-service/`. The microservice features:
- Server-to-server stateless inference with Bearer token authentication.
- Strict RAM-only handling with no disk writes and zero telemetry.
- Spatial-frequency attention feature localization baseline that can seamlessly host custom fine-tuned weights without licensing conflicts.

---

## 4. Empirical Evaluation Results

The evaluation harness (`scripts/eval/run-eval.ts`) was executed across 30 synthetic tamper cases (10 splice, 10 blur, 10 resize) and 20 untouched baseline images.

### Measured Metrics Summary
| Metric | Measured Value | Target Reference |
| :--- | :--- | :--- |
| **Mean IoU (Jaccard Index)** | **48.76%** | $\ge 20\%$ overlap |
| **Mean Precision** | **55.79%** | Robust region bounds |
| **Mean Recall** | **91.70%** | High sensitivity |
| **Untouched False Positive Rate (FPR)** | **0.0%** | Zero false alarms |

### Breakdown by Tamper Modality
- **Splice Tampering**:
  - *Mean IoU*: 32.41%
  - *Recall*: 75.97%
  - *Notes*: Noise variance and quantization step shifts reliably trigger ELA and Noise residual cues. Subtle boundaries are captured when difference exceeds background MAD.
- **Blur Tampering**:
  - *Mean IoU*: 55.82%
  - *Recall*: 99.14%
  - *Notes*: Sharpness variance drops precipitously in blurred regions, causing high z-score divergence against untouched background.
- **Resize / Resampling Tampering**:
  - *Mean IoU*: 58.06%
  - *Recall*: 100.00%
  - *Notes*: Resampling artifacts create high consistency disruption in noise residual blocks.

### Failure Cases & Limitations
1. **Identical Recompression History**: When an inserted patch is re-saved at the exact same JPEG quality and quantization table as the base image with no resizing, JPEG Ghost indicates 0 deviation. Fusion relies primarily on noise residual and ELA.
2. **Aggressive Social Media Compression**: Images re-compressed multiple times (e.g., through WhatsApp or Instagram) experience smoothed noise residuals, decreasing classical cue agreement. In such cases, the UI safely relies on overall provider detection probability and displays hedged notices.
3. **Low-Resolution Inputs (< 128px)**: Block-based metrics (16x16 and 32x32) yield coarse grids with limited statistical degrees of freedom for median/MAD estimation.
