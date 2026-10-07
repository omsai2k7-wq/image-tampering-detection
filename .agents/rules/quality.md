9. COPY AND TONE RULES
Plain language, short sentences, no jargon (if a technical term is needed, explain it in one clause).
Calm and protective. Never use fear-based or sensational wording. Never blame the person in the image.
Probabilities, not verdicts. Always show limits and the disclaimer next to a result.
All strings live in lib/i18n/en.ts from the start.
10. ACCESSIBILITY, PERFORMANCE, QUALITY BARS

Accessibility

prefers-reduced-motion: disable Lenis, shader animation (render one static frame), particle motion, glitch loops, magnetic effects, custom cursor; replace with simple fades. Implement via a useReducedMotion hook and a global CSS media query.
Full keyboard operability: dropzone is a focusable button with Enter/Space; visible focus rings (cyan, 2 px, offset 2); logical tab order; skip-to-content link.
Semantic landmarks (header, main, section with aria-labelledby, footer); proper heading hierarchy (one h1).
Status changes announced via aria-live; the score gauge has a text alternative ("Manipulation likelihood 87 percent, likely manipulated").
Never convey meaning by colour alone; always pair with text/icon.
Alt text on user-previewed images: "Preview of the uploaded image".

Performance

Shader is expensive (50 iterations per pixel). Single shared background instance mounted once at root (position: fixed; inset: 0; z-index: -1), active across entire site including loading screen, landing, upload, processing, results, about, and footer. Never paused by section (paused only when tab is hidden or prefers-reduced-motion is on). Default renderScale 0.5 on desktop, 0.4 on screens < 768 px, capped at DPR 1.5. Adaptive quality: measure average frame time over ~60 frames; if > 24 ms, lower renderScale by 0.1 (min 0.3) and never raise it again in the same session. Keep foreground animations lightweight.
Target Lighthouse (mobile): Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95.
Lazy-load below-the-fold sections and the ADRIA panel (next/dynamic). Use next/font with display: swap.
Avoid layout shift: reserve space for all animated blocks.
Clean up everything on unmount (RAF, listeners, observers, object URLs, speech, mic streams, WebGL resources).

Quality

No console errors or warnings in production build.
Works in latest Chrome, Edge, Safari, Firefox (voice features degrade gracefully where unsupported).
Handle WebGL context loss by showing the CSS gradient fallback.

12. ACCEPTANCE CHECKLIST (must all pass)
 Loading screen shows the ATC shader, TRACE glitch-resolve wordmark, real-progress counter, iris exit; min 2.6 s, max 5 s; once per session.
 Landing, upload, processing, results, and about sections all present, in that order, in a single page.
 Dropzone supports drag, click, paste; validates type/size/magic bytes; dissolve-to-scanlines transition.
 Processing animation runs ≥ 3.5 s, has cancel, uses neutral status text, and no fake percentage.
 Results show animated gauge, verdict, confidence, reasons, always-visible disclaimer, and India next-steps.
 With DETECTION_PROVIDER=mock the whole flow works offline; with a real key it works through /api/analyze.
 No secret appears in client bundle, network tab, logs, or git. .env.local is git-ignored.
 ADRIA: floating orb with 4 states, streaming text chat, 8 languages, voice in/out with graceful fallbacks, localised chips, result-summary handoff, safety behaviours verified.
 About section contains the exact team text and four member cards with no invented details.
 Reduced-motion, keyboard-only, and screen-reader passes done.
 npm run build and npm run lint pass with zero errors.