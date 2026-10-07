# 6. EXPERIENCE: STAGE BY STAGE (PART A)

## 6.1 Stage 1: LOADING SCREEN (components/intro/LoadingScreen.tsx)

This is the signature moment. It reuses the single persistent root ATC shader background (`ShaderBackground` at `position: fixed; inset: 0; z-index: -1`) which continues across the entire site. Never mount a second shader instance.

### Layers (bottom to top)
1. Persistent `<ShaderBackground />` mounted once at root.
2. The loader sits on top with its radial vignette (transparent centre to `#05060A` edges at ~85%) so the text always has contrast against the bright shader.
3. Scanlines + film grain.
4. Centre content.
5. Corner HUD details: top-left `TRACE // v1.0`, top-right a live mono clock/uptime counter, bottom-left `DIGITAL IMAGE FORENSICS`, bottom-right the percent counter. System Palatino font stack, 11 px, uppercase, `text-white/50`.

### Centre Content
- `GlitchWordmark` spells `TRACE` in Palatino font stack (`clamp(4rem, 16vw, 14rem)`). Each letter starts as a random glyph from `▓▒░#@%&01`, cycling rapidly, and resolves left to right (≈120 ms apart) into the true letter. While resolving, each letter has cyan and red chromatic-aberration offsets (±6 px) that collapse to 0 on lock-in. After all letters lock, run one quick horizontal slice-glitch (`clip-path` bands shifting ±10 px for 180 ms), then hold sharp.
- Under the wordmark: a status line that cycles through (each fades/blur-swaps every ~700 ms):
  - `INITIALISING FORENSIC ENGINE`
  - `CALIBRATING PIXEL ANALYSIS`
  - `WAKING UP ADRIA`
  - `READY`
- A 1 px progress line (cyan → violet gradient) under the status, with a soft glowing head.
- Percent counter `000` → `100` in Palatino tabular numbers.

### Progress Logic (real, not fake)
- Progress is driven by actual readiness: `document.fonts.ready`, shader first frame drawn (via background state), critical images/decoders warmed. Smoothly ease the displayed number toward the real value.
- Enforce a minimum duration of 2.6 s (so the animation can be appreciated) and a maximum of 5 s (never block the user).
- Show once per session (`sessionStorage`), but allow `?intro=1` to force it. If skipped, jump straight to the landing page animation.

### Exit Transition
- Wordmark scales to 1.15 and blurs out (500 ms).
- A circular iris (`clip-path: circle(0% → 150% at 50% 50%)`, 1.1 s, expoOut) expands and reveals the landing page beneath. When the iris exit finishes, the persistent background simply stays with no remount and no flash, continuing behind the landing page, upload, processing, results, About and footer.
- Landing hero elements then stagger in (§6.2).
- Body scroll is locked during loading and released on exit.
- Reduced motion: skip glyph cycling, crossfade the wordmark in, 600 ms total, no iris (simple fade).
- Fallback: if WebGL2 is unavailable, show an animated CSS gradient mesh in the same palette. The loader must still complete.

---

## 6.2 Stage 2: LANDING (Hero, ProblemSection, HowItWorks)

Persistent background: `ShaderBackground`, a `position: fixed; inset: 0; z-index: -1` wrapper around a single ATC shader instance mounted once at the root. The shader is persistent across the ENTIRE site and is NEVER paused by section. It is paused only when the tab is hidden or `prefers-reduced-motion` is on (showing one static frame). Covered by a fixed overlay stack: (a) dark gradient (`#05060A` at 55-70% opacity, stronger at top/bottom), (b) subtle radial vignette, (c) film grain. Dynamic state & scroll reactive: scroll velocity maps to speed prop (base 1 up to ~1.8, easing back with spring) and shifts overlay gradient; phase tint transitions smoothly (600 ms) through idle/landing (neutral), processing (darker, speed 1.4, faint cyan pulse), result (soft tint by verdict: green/amber/red at 12-18%), and dimming when ADRIA panel is open.

### Hero
- Eyebrow: `DIGITAL IMAGE FORENSICS FOR EVERYONE`.
- Headline (word-mask reveal): `"Every edit leaves a trace."` The word `trace` has the glitch→resolve effect on a loop every ~6 s (brief chromatic split).
- Sub-copy (max 2 lines): `"Check whether an image has been morphed, face-swapped or AI-generated. In seconds, in plain language, with clear next steps."`
- Primary CTA `"Check an image"` (`MagneticButton`) smooth-scrolls to `#analyze`. Secondary ghost link `"How it works"`.
- Trust chips (small, glass): `No account` · `Images not stored` · `Probability, not proof`.
- Right/background visual: `GlitchFace`, a Canvas 2D particle face. Generate ~1,800 points by drawing a face silhouette SVG path to an offscreen canvas and sampling opaque pixels. Particles drift gently, repel from the cursor, and every ~5 s a glitch event displaces horizontal bands of particles with cyan/red offset, then they spring back into the sharp face ("distortion → clarity"). On mobile reduce to ~700 points. Reduced motion: static, no repulsion.
- Scroll hint: `SCROLL` with a thin animated line.

### Problem Section (#problem)
- Headline: `"When a fake spreads, three things break at once."`
- Three glass cards that stack and slide up on scroll (sticky stacking on desktop), each featuring a 3D `BorderBeam` effect staggered by 2.0 s:
  1. **Detection fails.** Most people can't tell real from fake by eye, and the tools that can are built for researchers.
  2. **Response fails.** Victims often don't know where to report or how to show an image was altered, and shame keeps many silent.
  3. **Trust fails.** Once doubt exists, even real images get dismissed.
- Each card has a small animated line-icon (lucide) and a number 01/02/03. No statistics unless supplied by the team.

### How It Works (#how)
- Three steps connected by an SVG line that draws itself on scroll (`pathLength` bound to scroll progress): `Upload → Analyse → Understand & act`.
- Each step has a one-line description and honest limitations note.
