# TRACE Change Request: Part 1 — UI & Content Changes

## 1. Font: Palatino Everywhere
- Remove Space Grotesk and JetBrains Mono (next/font imports, CSS variables, Tailwind config). Palatino is a licensed font, so do NOT download or embed it. Use a system font stack that resolves to Palatino or a metric-compatible clone:
  ```css
  font-family: "Palatino", "Palatino Linotype", "Book Antiqua", "URW Palladio L", "P052", "Palladio", Georgia, serif;
  ```
- Set this stack as the single font for headings, body, labels, buttons, HUD text, the ADRIA chat, and numbers (set it as `--font-sans` and `--font-display` in `globals.css` and Tailwind, so there is one source of truth).
- Re-tune typography for a serif face:
  - Headlines: weight 400-700, letter-spacing -0.02em, line-height 1.05.
  - Small uppercase labels and HUD text: 11-12px, letter-spacing 0.2em, `font-variant-numeric: tabular-nums`, opacity ~60%.
  - Body: 17-18px, line-height 1.65.
  - TRACE wordmark and gauge number use italic or regular Palatino at large size for an elegant, cinematic feel.
- Confirm loading-screen glitch wordmark, percent counter, and score gauge align properly with the new font (no layout shift or clipping).

---

## 2. 3D Border Beam Effect
Create `components/shared/BorderBeam.tsx` and use it on the main UI panels: Dropzone, PreviewCard, ProcessingStage frame, ResultPanel, ForensicsPanel, ADRIA panel, the three Problem cards, and the four team cards.

- **Look:** Thin icy-cyan / cool-white forensic scanning beam travelling continuously around perimeter of the box, with soft luminous glow, subtle depth, and short fading trail behind the beam. Low intensity, no rainbow colours, no thick glow.
- **Implementation:**
  - Panel is `position: relative`. BorderBeam renders absolutely positioned, `pointer-events-none`, `aria-hidden` layer with `border-radius: inherit`.
  - Mask so only border ring is visible: padding of beam width (1.5px),
    `mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude;`
  - Beam travels along perimeter with `offset-path: rect(0 auto auto 0 round <radius>)` and animated `offset-distance` from 0% to 100% (duration 6-9s). Beam head is short gradient segment (80-120px) from transparent to `#BFF6FF` to `#00E5FF`.
  - Duplicate beam layer behind with `filter: blur(6px)` at ~40% opacity. Faint 1px static inner border (`rgba(255,255,255,0.08)`).
  - Depth: subtle inner highlight at top edge; on pointer devices, 3D tilt of panel toward cursor (max 3-4 deg, perspective 1000px, spring eased).
  - Fallback for browsers without `offset-path rect()`: rotating conic-gradient via `@property --angle`.
  - Props: size (120), duration (7), delay, reverse, intensity (0.6), colorFrom, colorTo, radius, enableTilt. Stagger delays across multiple cards.
  - State variations: ProcessingStage uses duration 3s and higher intensity; ResultPanel tints beam toward verdict color; ADRIA uses 10s beam.
  - Performance: Pause off-screen via IntersectionObserver and when tab is hidden. Reduced motion shows static border.

---

## 3. Non-Copyable Text
Make page text impossible to select or copy through normal means:
- `globals.css`: apply to html/body and all elements:
  `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;` and `::selection { background: transparent; }`
- **Exceptions:** `input`, `textarea`, `[contenteditable]`, and `.selectable` must stay `user-select: text`.
- Client component `CopyGuard` in `app/layout.tsx` listening on `copy`, `cut`, `dragstart`, `selectstart` and calling `preventDefault()` unless target is inside editable element. Include comment that this deters casual copying and does not prevent screenshots/devtools.
- Disable image dragging (`draggable={false}`, `-webkit-user-drag: none`).
- Helplines (`tel:1930`, `tel:1098`, `tel:14416`, `tel:112`) and URLs (`cybercrime.gov.in`, `StopNCII.org`) are real tappable links with `target="_blank"` and `rel="noopener noreferrer"`.
- Programmatic "Copy summary" button and "Save analysis image" continue working. Screen readers read all text normally.

---

## 4. Name Correction: "Pavan Tej R"
The team member's name is **Pavan Tej R**, not "Pavan Tej".
- Every occurrence in About section, team array, footer, dictionaries, documentation, metadata must read "Pavan Tej R" with initials "PT".
- About paragraph:
  > "TRACE is a project by Chethana Poorvi K N, P. Harshini Reddy, P. Omsai Reddy, and Pavan Tej R, built to explore and understand the hidden details in digital images."
- Full name wraps without truncation on mobile.
