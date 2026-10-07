4. DESIGN SYSTEM

Concept: "Truth emerging from distortion." Everything glitches, warps, or blurs, then resolves into sharp clarity. Minimal layouts, huge type, generous negative space, and a living GPU background so it feels alive without clutter.

4.1 Colour tokens (define as CSS variables in globals.css, expose in Tailwind)
--bg:          #05060A   /* near-black */
--bg-elev:     #0B0D14
--surface:     rgba(255,255,255,0.04)
--border:      rgba(255,255,255,0.10)
--text:        #E9ECF5
--text-dim:    #8B93A7
--cyan:        #00E5FF   /* primary / authentic-leaning accents */
--violet:      #8B5CF6   /* secondary / brand glow */
--amber:       #FFB020   /* suspicious */
--red:         #FF2E4D   /* manipulated / warning only */
--green:       #2CFFA7   /* likely authentic */

Rules: dark theme only. Cyan and violet are the brand; red appears only for "likely manipulated" and errors; amber only for "suspicious"; green only for "likely authentic". No other hues. Body text must hit WCAG AA contrast.

4.2 Typography
Display: Space Grotesk, weights 500/700, tight tracking (-0.04em on headlines), clamp-based fluid sizes (clamp(2.75rem, 9vw, 9rem) for hero).
Labels/numbers/status text: JetBrains Mono, uppercase, 0.18em tracking, 11-12 px.
Body: Space Grotesk 400, 16-18 px, line-height 1.6, max width 62ch.
4.3 Surfaces and effects
Glass cards: bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl.
Film grain overlay over the whole app (SVG feTurbulence data-URI, 4-6% opacity, pointer-events-none, fixed). Slightly animated via stepped background-position keyframes.
Scanline overlay (repeating-linear-gradient, 2-3% opacity) used on the loading screen, processing stage, and ADRIA panel.
Glow: soft cyan/violet radial gradients behind key elements; never harsh drop shadows.
Chromatic aberration (cyan and red text-shadow offsets that collapse to 0) as the signature "glitch → resolve" effect.
Conic animated border using CSS @property --angle rotating a conic-gradient (used on the dropzone and primary CTA).
4.4 Layout
12-column grid, max content width 1280 px, section padding py-28 md:py-40.
Sections separated by whitespace and thin 1 px gradient dividers, not boxes.
A thin fixed progress bar at the top (scroll progress, useScroll + useSpring).
Minimal top nav: wordmark left; anchor links (How it works, Check an image, About) and language switcher right; collapses to a menu button on mobile. Nav fades in after the loading screen exits.
4.5 Custom cursor (desktop, fine pointer only)
8 px dot + 36 px ring that lags with spring physics.
Ring grows and shows a label ("Drop", "Open", "Talk") over relevant elements, and becomes a crosshair over the dropzone.
Hidden on touch devices and under reduced motion. Never hide the native cursor on form fields.
5. MOTION SYSTEM

Create lib/motion.ts exporting:

Easings: expoOut = [0.16, 1, 0.3, 1], smooth = [0.65, 0, 0.35, 1].
Durations: fast 0.25, base 0.6, slow 1.1.
Variants: fadeUp, maskReveal (text lines slide up from overflow-hidden wrappers), stagger(parent, 0.06), scaleIn, glitchIn.

Global motion rules

Every element that enters the viewport animates in once (whileInView, viewport={{ once: true, margin: "-10%" }}).
Headlines reveal word by word with masks. Body text fades up. Cards stagger.
Hover: magnetic pull on primary buttons (max 12 px translation), subtle scale 1.02, glow intensifies.
Page-level transitions between analyze states use AnimatePresence mode="wait" with blur+opacity+y transitions (filter: blur(12px) → blur(0)).
Max one "hero-level" motion per viewport; everything else stays subtle so the page feels minimal, not noisy.
Animate only transform, opacity, filter, and clip-path. Never animate layout properties in scroll handlers.