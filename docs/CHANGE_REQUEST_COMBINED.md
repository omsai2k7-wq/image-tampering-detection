---
trigger: always_on
---

# TRACE: Combined change request for Antigravity

Paste the block below into the Antigravity agent (Planning mode). It combines **Part 1** (Palatino font, 3D Border Beam, non-copyable text, the name "Pavan Tej R") and **Part 2** (the upgraded fused manipulation heatmap with face analysis, optional ML localiser and a validation harness) into one prompt.

If you built the app from `TRACE_master_prompt_v2.md`, Part 1 is already in that spec, so the agent will simply verify it and fix anything missing. Part 2 is the new work.

```
CHANGE REQUEST for TRACE. Apply Part 1 and Part 2 below across the whole app.
Where this conflicts with docs/MASTER_PROMPT.md or the rule files in .agents/rules/ or
AGENTS.md, this request wins. Update docs/MASTER_PROMPT.md, the affected rule files
(split any file that would exceed 12,000 characters into -a / -b files at a heading
boundary), AGENTS.md and the acceptance checklist so everything matches, then implement.
If a part is already implemented correctly, verify it and do not rewrite it.
Run `npm run build`, `npm run lint` and the tests at the end and fix all errors.

##########################################################################
PART 1: UI AND CONTENT CHANGES
##########################################################################

=== 1. FONT: PALATINO EVERYWHERE ===
- Remove Space Grotesk and JetBrains Mono (next/font imports, CSS variables, Tailwind
  config). Palatino is a licensed font, so do NOT download or embed it. Use a system
  font stack that resolves to Palatino or a metric-compatible clone:
    font-family: "Palatino", "Palatino Linotype", "Book Antiqua",
                 "URW Palladio L", "P052", "Palladio", Georgia, serif;
- Set this stack as the single font for headings, body, labels, buttons, HUD text,
  the ADRIA chat, and numbers (set it as --font-sans and --font-display in
  globals.css and Tailwind, so there is one source of truth).
- Re-tune the typography for a serif face:
  - Headlines: weight 400-700, letter-spacing -0.02em, line-height 1.05.
  - Small uppercase labels and HUD text: 11-12px, letter-spacing 0.2em,
    font-variant-numeric: tabular-nums, opacity ~60%.
  - Body: 17-18px, line-height 1.65.
  - The TRACE wordmark and the gauge number use italic or regular Palatino at large
    size for an elegant, cinematic feel.
- Check that the loading-screen glitch wordmark, the percent counter and the score
  gauge still align properly with the new font (no layout shift or clipping).

=== 2. 3D BORDER BEAM EFFECT ===
Create components/shared/BorderBeam.tsx and use it on the main UI panels:
Dropzone, PreviewCard, ProcessingStage frame, ResultPanel, ForensicsPanel, ADRIA panel,
the three Problem cards, and the four team cards. Remove the previous conic-gradient
animated border from the dropzone so there is only one border effect.

Look: a thin icy-cyan / cool-white forensic scanning beam travelling continuously
around the perimeter of the box, with a soft luminous glow, subtle depth, and a short
fading trail behind the beam. Elegant and cinematic, NOT gaming neon: low intensity,
no rainbow colours, no thick glow.

Implementation:
- The panel is `position: relative`. BorderBeam renders an absolutely positioned,
  pointer-events-none, aria-hidden layer with `border-radius: inherit`.
- Mask so only the border ring is visible: padding of the beam width (1.5px),
  `mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);`
  `mask-composite: exclude;` (and the -webkit- versions).
- Beam: an element travelling along the perimeter with
  `offset-path: rect(0 auto auto 0 round <radius>)` and an animated `offset-distance`
  from 0% to 100% (linear, infinite, duration 6-9 s). This gives uniform speed around
  the box, including wide rectangles. The beam head is a short gradient segment
  (about 80-120px) going from transparent to #BFF6FF to #00E5FF at the head, which
  makes the fading trail.
- Glow: duplicate the beam layer behind it with `filter: blur(6px)` at about 40% opacity.
  Add a faint 1px static inner border (rgba(255,255,255,0.08)) so the panel edge is
  always visible.
- Depth: a very subtle inner highlight at the top edge, and on pointer devices a slight
  3D tilt of the panel toward the cursor (max 3-4 degrees, perspective 1000px, spring
  eased). The beam stays attached to the border while the panel tilts.
- Fallback for browsers without offset-path rect() support (check with @supports):
  use a rotating conic-gradient via `@property --angle`, masked to the border the same way.
- Props: size (default 120), duration (default 7), delay (so cards are out of sync),
  reverse, intensity (0 to 1, default 0.6), colorFrom, colorTo, radius (inherits from
  the panel). Stagger the delays across the multiple cards so they never pulse together.
- State variations: ProcessingStage uses duration 3 s and higher intensity; ResultPanel
  tints the beam very slightly toward the verdict colour (green, amber or red, kept
  subtle, with the head still near white); ADRIA panel uses a slower 10 s beam.
- Performance: animate only transform / offset-distance / opacity. Pause beams that are
  off-screen (IntersectionObserver) and when the tab is hidden. No more than about 6
  beams animate at the same time.
- Accessibility: with prefers-reduced-motion, show a static faint border (no travelling
  beam, no tilt).
- Responsive at 360, 768, 1280 and 1920 px, and handles any panel size, since the
  offset-path rect uses the element's own box.

=== 3. NON-COPYABLE TEXT ===
Make page text impossible to select or copy through normal means:
- globals.css: apply to html/body and all elements:
    user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  and `::selection { background: transparent; }`
- EXCEPTION (required, or typing breaks, especially on iOS Safari): input, textarea and
  [contenteditable] elements must stay `user-select: text` so users can type, paste into
  and edit the ADRIA message box. Add a utility class `.selectable` for these.
- Add a small client component (CopyGuard) mounted in app/layout.tsx that listens on
  document for `copy`, `cut`, `dragstart` and `selectstart`, and calls preventDefault()
  unless the event target is inside an input, textarea or [contenteditable].
- Disable image dragging (`draggable={false}` and `-webkit-user-drag: none`) on all img/canvas.
- Do NOT disable the right-click menu globally, and do NOT block keyboard shortcuts like
  F12, Ctrl+U or Ctrl+A. That makes the site hostile and does not work anyway.
- Usability needs that must still work, since users in distress need the numbers and links:
  - Make every helpline number a `tel:` link (1930, 1098, 14416, 112) and every URL
    (cybercrime.gov.in, StopNCII.org) a real, tappable link with target="_blank" and
    rel="noopener noreferrer", so nobody needs to copy them.
  - Keep the "Copy summary" button in the results panel working (it writes the summary
    programmatically via navigator.clipboard.writeText), and keep the "Save analysis
    image" download in the forensics panel working.
- Screen readers must still read all text normally (do not use aria-hidden or visibility
  tricks on real content).
- Add a one-line comment in CopyGuard stating that this only deters casual copying and
  cannot stop screenshots, dev tools or view-source.

=== 4. NAME CORRECTION: "PAVAN TEJ R" ===
The team member's name is **Pavan Tej R**, not "Pavan Tej". Search the whole project
(`grep -ri "pavan tej"`) and fix EVERY occurrence in: the About section paragraph,
the team array and cards, the footer, lib/i18n dictionaries (all languages), README.md,
docs/MASTER_PROMPT.md, docs/FORENSICS_NOTES.md, .agents/rules/*.md, AGENTS.md, page
metadata and any alt text. The About paragraph must read exactly:
  "TRACE is a project by Chethana Poorvi K N, P. Harshini Reddy, P. Omsai Reddy, and
   Pavan Tej R, built to explore and understand the hidden details in digital images."
His team card shows the full name "Pavan Tej R" with monogram "PT". The long name must
wrap, not truncate, on mobile. After the fix, re-run the grep and confirm that no
"Pavan Tej" appears without the trailing " R".

##########################################################################
PART 2: FUSED MANIPULATION HEATMAP (FORENSICS UPGRADE)
##########################################################################

Upgrade the Forensic Heatmap so it highlights the regions of the uploaded image that are
most likely to be manipulated, using a technically sound, multi-cue pipeline. This REPLACES
sections 7.3 to 7.8 of docs/MASTER_PROMPT.md and overrides any wording in the spec or in
.agents/rules/*.md that forbids pointing at regions. If docs/colab_reference.ipynb exists,
use its methods and parameters as the base (document this in docs/FORENSICS_NOTES.md).

=== A. CUE MAPS (browser, Web Worker, lib/forensics/) ===
Each cue returns a normalised Float32Array map (0..1) at the analysed size (longest side
capped at 2048; the JPEG-ghost cue is capped at 1024). Constants at the top of each file.
1. ELA (ela.ts): JPEG recompress at q90, per-pixel abs diff (max over channels), amplify,
   blur radius 2, normalise by the 99.5th percentile. Edge-aware normalisation: divide by
   (local gradient magnitude averaged over 7x7 + epsilon) so natural edges, text and logos
   do not dominate. Mask out saturated pixels (<=3 or >=252 in any channel); they carry no
   information.
2. Noise residual (noise.ts): luminance minus 3x3 median copy, variance per 16x16 block,
   robust z-score (median/MAD over valid blocks), |z| clipped 0..4 to 0..1, bilinear upsample.
3. Sharpness (sharpness.ts): Laplacian variance per 32x32 block, log(1+v), robust z-score,
   0..1, upsample.
4. JPEG ghost (ghost.ts): recompress at qualities 55..95 step 5; for each, compute the
   per-pixel squared difference, box-average over 16x16 blocks; per block find the quality
   with the minimum difference (the "ghost" quality). Compute the dominant ghost quality
   over the image (mode of the argmin histogram); the map is the normalised deviation of
   each block's ghost quality from the dominant one, weighted by how clear the minimum is.
   Only meaningful for JPEG input: for PNG input skip this cue and mark it "Not applicable".
5. Frequency (fft.ts): unchanged; stays an educational card, NOT part of the fusion.
Per cue also return coveragePct (share of valid pixels above 0.6), mean, p95.

=== B. FACE-AWARE FORENSICS (faceforensics.ts) ===
Morphs and deepfakes are mostly faces, so analyse the face explicitly.
- Add dependency @mediapipe/tasks-vision. Use FaceLandmarker (478 landmarks) in the worker,
  or on the main thread if the worker cannot load it. Self-host the WASM files and the
  face_landmarker.task model under /public/mediapipe/ (add a script `npm run fetch-models`
  that downloads them from the official MediaPipe sources documented at
  ai.google.dev/edge/mediapipe; verify the current URLs and license). No runtime calls to
  third-party hosts.
- Detect up to 3 faces. If none is found, skip this layer and say so in the UI
  ("No face detected; analysing the whole image only").
- For each face rasterise masks from the landmark connection constants exposed by
  FaceLandmarker: face oval, left eye, right eye, nose, lips, plus a boundary ring (inner
  band and outer band, each ~4% of the face width, on either side of the oval contour).
- Background reference = pixels outside the face oval dilated by 8%, excluding saturated
  and very high-gradient pixels.
- Region anomaly score for each facial part = robust |z| of its mean (noise variance,
  Laplacian variance, ELA, ghost deviation) versus the background reference distribution.
- BLEND-BOUNDARY DISCONTINUITY: split the oval contour into 24 arc segments. For each
  segment compare the inner band and the outer band: difference in mean Cb and Cr, noise
  variance, sharpness and ELA, each robustly normalised, combined into one 0..1
  discontinuity score.