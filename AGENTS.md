# TRACE Development Rules & Guidelines
You are building TRACE, a production-quality, cinematic, minimal web app for digital image forensics.
Refer to .agents/rules/ for modular specifications:
- design-system.md: Visual design tokens, typography, surfaces, and motion system
- experience-stages-a.md: Stages 1 & 2 (Loading screen with iris exit, Landing with Hero, Problem & How-It-Works)
- experience-stages-b.md: Stages 3 to 6 (Analyze Zone state machine, Results, Next Steps, About, Footer)
- detection-api.md: Server-side detection API, provider adapters, rate limiting, and validation
- adria.md: Multilingual ADRIA assistant, streaming route, Web Speech voice integration
- quality.md: Accessibility, performance targets, copy rules, and acceptance checklist
- CHANGE_REQUEST_COMBINED-a.md: Part 1 — Palatino font stack, 3D BorderBeam, non-copyable text, name "Pavan Tej R"
- CHANGE_REQUEST_COMBINED-b.md: Part 2 — Fused forensic heatmap, MediaPipe face forensics, ML service, evaluation harness

Always maintain strict TypeScript, no placeholder code, zero unhandled errors, and strict security isolation for API keys.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
