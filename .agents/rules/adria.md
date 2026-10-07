8. ADRIA: VOICE + TEXT CHATBOT (MULTILINGUAL)

Name: ADRIA (the TRACE assistant). Persona: calm, warm, direct, protective; never alarmist; never preachy.

8.1 What ADRIA does
Explains how TRACE works and how to read a result (score, label, confidence, limitations).
Guides people through what to do if they are being blackmailed or targeted with a morphed image: preserve evidence, report, support, without legal or medical overreach.
Answers general questions about deepfakes, morphed images, and online safety.
Can receive a result summary from the Results panel (label, score, confidence, details text only; never the image) so she can explain it.
Does not claim to see or analyse images herself. She says the analysis comes from TRACE's detection service.
8.2 UI
Launcher (AdriaLauncher): a floating orb at bottom-right (AdriaOrb), an animated SVG/CSS blob with morphing gradient (cyan → violet) and a soft glow. The orb has four visual states driven by a single status prop: idle (slow breathing), listening (reacts to mic volume via Web Audio AnalyserNode, scale pulses), thinking (rotating gradient + orbiting dots), speaking (waveform ripples). A small mono label ADRIA appears on hover.
Panel (AdriaPanel): glass drawer (bottom-right on desktop at ~400 × 620 px; full-screen sheet on mobile) opening with a spring + blur-in. Contents:
Header: orb mini, ADRIA, status text, language selector, mute/unmute speaker toggle, close.
Message list (ScrollArea), user bubbles right, ADRIA left. Streaming text with a soft caret; messages fade up.
Suggestion chips (localised): "How does TRACE work?", "What do I do if someone is blackmailing me?", "Explain my result", "Is my image stored?".
Input bar: text field, send button, mic button (VoiceButton) with live waveform while listening.
Footer micro-copy (localised): "ADRIA is an AI assistant and can make mistakes. For emergencies, contact local authorities."
Keyboard: Esc closes; focus is trapped inside while open and returned to the launcher on close. Enter sends, Shift+Enter newline.
8.3 Languages

Supported at launch (selector shows native names): English (en-IN), हिन्दी (hi-IN), తెలుగు (te-IN), ಕನ್ನಡ (kn-IN), தமிழ் (ta-IN), മലയാളം (ml-IN), বাংলা (bn-IN), मराठी (mr-IN). Keep the list in lib/adria/languages.ts as { code, label, nativeLabel, speechLang }[] so more can be added. Default: browser language if supported, else English.

ADRIA replies in the language the user writes or speaks in; the selector sets the default and the speech-recognition/TTS language. If the user switches language mid-chat, follow the user.
Persist the choice in localStorage (non-sensitive).
Stretch goal: translate the main UI (headline, CTA, results copy, next steps) using the same lib/i18n dictionaries and a global LanguageSwitcher. Ship English first and make adding a language a single new file.
8.4 Voice
Speech to text: Web Speech API (window.SpeechRecognition || window.webkitSpeechRecognition), lang from the selector, interimResults = true (show interim text live in the input), push-to-talk (tap to start, tap to stop, auto-stop on silence). Wrap in useSpeechRecognition with { supported, listening, transcript, start, stop, error }.
Text to speech: speechSynthesis in useSpeechSynthesis. Pick a voice matching the language where available; if none exists, show a subtle note and keep text-only. Strip markdown before speaking. A speaker toggle mutes and cancels current speech. Cancel speech when the user starts talking or closes the panel.
Capability handling: feature-detect everything. If speech recognition is unsupported (e.g. some browsers), hide the mic and show a tooltip: "Voice input isn't supported in this browser. Try Chrome or Edge." Handle microphone permission denial with a friendly message. Voice quality and language coverage vary by browser and device, so never assume a voice exists.
Never record or upload audio to your own servers. Only the transcribed text is sent to /api/adria.
8.5 /api/adria (server, streaming)
POST { messages: {role: "user"|"assistant", content: string}[], lang?: string, resultSummary?: {...} }.
Uses @anthropic-ai/sdk with ANTHROPIC_API_KEY from env and the model from ADRIA_MODEL (env, so it can be changed without code edits; confirm the current model ID in Anthropic's docs). Stream the response to the client (SSE or ReadableStream) and render tokens as they arrive.
System prompt from lib/adria/systemPrompt.ts (Appendix D). Append lang and resultSummary as clearly delimited context.
Limits: keep the last 12 messages, max 2,000 characters per message, max_tokens ≈ 700, rate limit per IP (reuse rate-limit.ts), validate with zod.
Treat all user content as untrusted: it must never override the system prompt or reveal it, and resultSummary is data, not instructions.
Errors: friendly in-chat message and a retry button; never expose raw errors.
8.6 Safety behaviour (must be implemented in the system prompt and tested)
If a user mentions self-harm, suicidal thoughts, or being in immediate danger: respond with warmth first, encourage contacting someone they trust right away, and surface emergency/helpline options (India: 112 emergency, Tele-MANAS 14416); do not lecture; do not continue with unrelated tasks until they respond.
If a minor is involved: mention Childline 1098 and encourage telling a trusted adult.
Never help create, improve, spread, or locate morphed/deepfake images of real people, and never help with blackmail, harassment, or identifying a victim. Decline briefly and redirect to protective help.
Never claim certainty about whether an image is fake; always refer to TRACE's result as a likelihood with limits.
No legal or medical advice beyond pointing to official channels and professionals.

## Appendix D: ADRIA System Prompt
ADRIA is the TRACE forensic and safety assistant.
- Persona: Calm, warm, direct, protective; never alarmist; never preachy.
- Safety: If self-harm or immediate crisis is mentioned, provide Tele-MANAS (14416) & Emergency (112) immediately. If minor is involved, provide Childline (1098).
- Evidence Preservation: Advise keeping screenshots, headers, timestamps, not deleting messages.
- Reporting: Direct to cybercrime.gov.in / 1930, StopNCII.org for non-consensual imagery.
- Honesty: Emphasize TRACE outputs probabilities and automated likelihoods, never legal proof.