# MISSION BRIEF v2 — GENESIZ 2026 AppForge: "The Impossible App"

You are the sole software engineer, technical lead and teacher for a 3-person student team. None of us can code. You write, run, test, deploy and document 100% of the code. We are product owners, testers and researchers: we hold the phones, run the tests you design, talk to real users, and report back exactly what we see.

Our #1 judging priority is a credible real-world impact story, backed by a demo that genuinely works. Judges will NOT install the app; they watch our ≤ 2-minute video and a live demo we run on our own best phone. Prefer reliability and honesty over cleverness. Think hard before each milestone and verify assumptions on real devices.

## 0. FIRST ACTIONS (before any app code)
1. Save this entire brief verbatim as CLAUDE.md in the project root so every future session starts with it.
2. Create docs/PROGRESS.md: milestone checklist, decisions, measured results, open issues, current deploy URL. Update it at the end of every milestone. In any new session, read CLAUDE.md and PROGRESS.md first and continue from there.
3. Check the environment (Windows, Claude Code desktop app): Node LTS, npm, Git. Install anything missing yourself (e.g., winget) and tell us if Windows asks us to approve something.
4. Reply with: (a) a 5-line plan, (b) 3 name options for the app (working name "Bat Mode"), (c) a checklist of things only humans can do (account logins etc.). Then wait for our go.

## 1. COMPETITION CONSTRAINTS (non-negotiable)
- Theme: a mobile app that does something unexpected, highly innovative or seemingly impossible, pushing phone hardware to its limits.
- Built during the competition: fresh repo, no pre-existing code of ours. Open-source libraries are fine. Commit early and often with descriptive messages — commit timestamps are our evidence the project was built during the event.
- Must work live. Mockups are rejected.
- Judges may ask us to explain implementation choices. Because we can't code, explainability is a hard requirement (section 14).
- Deliverables: (1) public GitHub repo, (2) working prototype: hosted HTTPS link + Android .apk, (3) demo video ≤ 2 minutes showing the core feature actually working, (4) README covering the problem, the technology and the interaction model.
- Judging: usefulness, originality, UI/UX, technical implementation, functionality, relevance to theme. Weights unannounced.
- Time: ~48 hours. Start: [FILL IN]. Submission deadline: [FILL IN].
- AI tools are allowed; disclose AI usage in the README.

## 2. PRODUCT & IMPACT STORY
One-liner: A free touchless switch for people who can't speak and can't reliably use a touchscreen — built from the speaker and microphone of the Android phone their family already owns.

How it works: the phone plays an inaudible ultrasonic tone, listens to the echo off the user's hand, and detects deliberate movement from the Doppler shift. That movement drives a switch-scanning communication board (AAC) that speaks phrases aloud.

Primary user (to be validated by our research, section 10): non-speaking people with motor impairments who use or could use AAC — e.g., people with cerebral palsy, ALS or stroke — who can make a coarse arm/hand movement but can't tap a touchscreen accurately or use voice control. Secondary user: their caregivers.

Core design insight — SWITCH SCANNING: the screen highlights options one at a time and a single "switch" selects. The core experience needs only ONE reliably detected motion. Make "deliberate motion = select" rock solid; directional gestures are a stretch goal.

Honest answers to the hardest critiques (each must be backed by OUR measurements or cited sources; otherwise mark [VERIFY]):
- "Why not the proximity sensor?" → It only reacts within a few cm over a small spot near the top edge — demanding exactly the precise targeting our users struggle with. Sonar senses a larger zone at greater distance. We must MEASURE our working range and false-trigger rate to prove this. (Web apps also cannot read the proximity sensor.)
- "Hasn't this been done?" → Credit prior art openly: SoundWave (Microsoft Research, CHI 2012), Samsung Air Gestures (2013, dedicated IR sensor), Pixel 4 Motion Sense (dedicated radar chip), Elliptic Labs (ultrasound sensing licensed to phone makers). Our contribution: free, installable software on ordinary phones, applied to assistive communication, with per-user calibration.
- "Why not voice control or camera switches?" → Our users may be non-speaking; camera-based switches need good light, a face in frame, and a camera pointed at a person all day. Sonar works in the dark and captures no images.

Claim discipline: never invent statistics, prices or quotes. Anything not measured by us or cited is marked [VERIFY]. No medical claims.

## 3. PLATFORM & STACK (decided — don't re-litigate unless technically blocked)
- Mobile web app (PWA) for Chrome on Android (our phones: recent Androids, 2022+), wrapped into an .apk with PWABuilder (Trusted Web Activity).
- Vite + React + TypeScript (strict). No backend, database, login, analytics or cloud AI. All processing on-device. Settings and calibration in localStorage.
- vite-plugin-pwa for manifest + service worker (offline after first load). Vitest for unit tests.
- Deploy: GitHub → Vercel (auto-deploy on push).
- Phone testing loop: the mic requires HTTPS. Use a Cloudflare quick tunnel (cloudflared, no account) or Vercel preview deployments; handle Vite's host allow-list. Give us ONE simple "open it on the phone" routine.
- Minimal dependencies. Generate all UI sounds with Web Audio — no audio asset files.
- Non-Chrome/iOS: show a simple "Best on Android + Chrome" screen. No further iOS work.

## 4. ARCHITECTURE — DE-RISKED BY DESIGN
- The product is built against an abstract input layer: a SwitchSource interface emitting typed SwitchEvents (MOTION; optionally PUSH/PULL). The Talk Board, calibration UX and settings never import sonar code directly.
- Providers:
  1. SonarSwitch — the hero.
  2. TapSwitch — full-screen tap as a switch; for development and as an accessibility option.
  3. CameraMotionSwitch — FALLBACK ONLY: low-res frame differencing in a region of interest, on-device, no frames stored or sent. Build it only if the fallback ladder (section 6) reaches L4.
- Build and polish the Talk Board on TapSwitch while sonar tuning continues, so product work never blocks on DSP.
- Structure: src/audio (I/O), src/dsp (pure signal processing), src/input (providers), src/gestures (pure state machine), src/features (screens), src/ui (components), src/config.ts (every tunable constant).

## 5. SONAR ENGINE — TECHNICAL SPEC (starting hypothesis; verify on device and adapt)
Audio I/O
- AudioContext requesting 48 kHz; read back the actual sampleRate and derive everything from it.
- Mic via getUserMedia with echoCancellation:false, noiseSuppression:false, autoGainControl:false, mono. Echo cancellation would erase our own tone — critical.
- Pilot tone: OscillatorNode sine, default ~19.5 kHz, valid range ~18–21.5 kHz (below Nyquist with margin). Fade in/out ~100 ms to avoid clicks. Cap output gain at a safe level.
- One big "Start" tap is required by browsers (a caregiver can do it once).
- Screen Wake Lock while running; pause on hidden tab, resume on visible.
- Device risks to check: Android routing audio to the earpiece or applying voice processing once the mic opens; headphones stealing the tone; low media volume. Detect via pilot SNR and show a plain fix-it message.

Placement (test in M1)
- Loudspeaker and mic are often on the bottom edge facing sideways, so echo from a hand above the screen may be weak. Test: (a) flat, hand above screen; (b) flat, hand approaching the bottom edge; (c) upright on a stand, bottom edge toward the user; (d) any phone-specific variant. Pick the best per phone and build the on-screen placement guide and "interaction zone" around it.

Analysis
- Start with AnalyserNode (fftSize 8192 ≈ 5.9 Hz bins at 48 kHz, smoothingTimeConstant 0) read each animation frame. Move to an AudioWorklet + custom FFT only if needed.
- Doppler: Δf = 2·v·f0 / c. At 19.5 kHz: 0.1 m/s ≈ 11 Hz, 1 m/s ≈ 114 Hz. Analyze ~±250 Hz around the carrier, excluding a guard band over the carrier's main lobe.
- Features: bandwidth-asymmetry approach from SoundWave (CHI 2012) — energy spread above vs below the carrier relative to a calibrated baseline. Per frame: motionEnergy (≥ 0) and a signed velocity proxy.
- Users may move slowly or have involuntary movement: personal thresholds from calibration (including a baseline of the user's own resting/involuntary movement), minimum sustained duration before triggering, reject rapid sign alternation, configurable cooldown, optional longer FFT window for slow movers.
- Gestures: MOTION (P0). PUSH/PULL/WAVE only as a stretch goal. Pure deterministic state machine with hysteresis + cooldown, emitting events with confidence.
- Gate detection while the app is speaking or playing sound, to prevent self-triggering.

## 6. GO/NO-GO GATES & FALLBACK LADDER (follow exactly)
- Gate 1 (≈ hour 3): on at least one team phone in at least one placement, the pilot is clearly above noise and a hand produces a visible, repeatable shift.
- Gate 2 (≈ hour 8), on the demo phone — targets: ≥ 90% detection over 20 deliberate movements; ≤ 1 false trigger per 5 minutes idle with people moving normally in the room; working range ≥ 15 cm. Report actual numbers either way.
- Fallback ladder — climb in order, report results at each step:
  - L1: sweep carriers 18–21.5 kHz × all placements × all team phones.
  - L2: near-ultrasonic 17–18 kHz (teens may hear it — check with us).
  - L3: retune — longer FFT window, wider guard band, stricter sustain/cooldown.
  - L4 (decision by hour 10, needs our explicit OK): ship CameraMotionSwitch as the main input, keep sonar as an "experimental" mode in the Lab, and rewrite the pitch honestly.
- Never fake or stage sonar behavior in any demo.

## 7. DEBUG LOOP FOR NON-CODERS (our main debugging channel — design for it)
- Self-test screen: one tap runs a ~20-second check and prints PASS/FAIL per item in plain English (mic access, sample rate, pilot SNR, placement quality, idle false triggers) with a one-line fix for each FAIL.
- "Share diagnostics" button: compact JSON (device info, sample rate, carrier, SNR, thresholds, last 30 s of features, event log) via the Web Share API (clipboard fallback), so our tester can send it to the laptop and paste it into this chat.
- Session recording export to /recordings, an offline replay harness to tune thresholds against our real data, and unit tests with synthetic spectra (still, deliberate motion, slow motion, tremor-like oscillation, people walking, background noise).

## 8. FEATURES & PRIORITIES
P0 — Lab: live zoomed spectrum + scrolling spectrogram (judges must SEE the echo), readouts (sample rate, carrier, SNR, motion energy, events), carrier slider, self-test, diagnostics, recording.
P0 — Calibration wizard (big, voice-guided): carrier sweep → hearing check ("Can anyone hear a whine?" — teens often hear up to ~19 kHz; move higher if yes) → placement guide → 10 s idle baseline including the user's natural resting movement → user's deliberate movement 5× → "Detection quality: Good / Fair / Poor" + fix-it tip.
P0 — Talk Board: 6 large editable tiles (Water, Help, Yes, No, Pain, Thank you). Scanning highlight at adjustable speed (1–4 s); MOTION selects → spoken aloud (speechSynthesis; English (India) default, Hindi if a voice exists) with large visual confirmation + vibration. Help tile: loud on-device alert + spoken "I need help", repeating until a caregiver taps Stop.
P0 — Measurement mode: guided protocols producing README-ready numbers on the demo phone: detection rate, false triggers per 5 min idle, max working distance in cm (tape-measure guided), approximate latency, and proof tests (lights off, camera covered, thin cloth over the phone — report honestly what works).
P1 — Settings (sensitivity, cooldown, scan speed, voice/language, carrier override, larger text, reduced motion, reset calibration) and robust states (mic denied, low SNR/headphones, audio suspended, wake lock unavailable, hidden tab, non-Chrome).
P1 — PWA + APK via PWABuilder (+ assetlinks.json so it opens full-screen), tested as an installed app.
Stretch — PUSH/PULL/WAVE advanced mode, only if everything above is solid.
Cut — Reader mode, presence mode, iOS.

## 9. UX & DESIGN
- Accessibility IS the product: WCAG 2.2 AA contrast, huge targets (min 64 px), scalable text, never color alone, ARIA labels, prefers-reduced-motion, triple feedback (visual + speech/sound + vibration) for every event.
- Visual identity: calm dark sonar aesthetic — a pulsing ring that reacts to the echo in real time. Beautiful but readable; this visual is the "proof" moment in the demo.
- If design/UI-audit skills are installed in this Claude Code environment, use them for a polish pass in M6.

## 10. IMPACT RESEARCH SUPPORT (our non-coding workstream — start in M0)
- Draft, for us to send, a short respectful outreach message to occupational therapists, speech therapists, special educators and disability organizations asking for a 15-minute call or written feedback, plus a 6-question interview guide (who would benefit, who wouldn't, what would make it unusable, setup and caregiver concerns, cost and access context, permission to quote).
- docs/IMPACT.md: persona; what real people actually told us (only with permission to quote); cost/access comparison with sources or [VERIFY]; who this is NOT for.
- Never film or quote anyone without explicit consent. If a teammate demonstrates the app, the video must not imply they are a user with a disability.

## 11. CODE QUALITY
- Production-grade, not tutorial code. No logic in React components beyond wiring. DSP, input providers and gesture code are pure where possible and unit-tested.
- Error handling everywhere audio, permissions or storage can fail.
- Comment only non-obvious DSP and design decisions, written so a non-coder can follow.
- Never leave main broken. Every milestone ends with a deployed, working build on the phone.

## 12. MILESTONES (hours from start)
- M0 (0–1h): scaffold, git, CLAUDE.md, PROGRESS.md, Vercel + HTTPS phone loop; outreach draft for our researcher.
- M1 (1–3h): Lab + self-test + diagnostics + placement test → Gate 1.
- M2 (3–8h): MOTION detector, baselines, recording/replay, tests → Gate 2.
- M3 (8–16h): Talk Board + scanning + speech on SwitchSource (build on TapSwitch, then wire SonarSwitch); calibration wizard. Execute L4 here if we decided it.
- M4 (16–20h): end-to-end on the demo phone + measurement mode with us → tell us to record a SAFETY TAKE of real demo footage immediately.
- M5 (20–28h): settings, robust states, PWA, APK, installed-app test.
- M6 (28–36h): polish, accessibility audit, stretch gestures only if all P0/P1 is solid.
- M7 (36–42h): docs, impact write-up, judge prep, final demo script and live-demo runbook.
- Feature freeze at hour 40 or 8 hours before the deadline, whichever is earlier. If behind, cut from the bottom of section 8 — never cut P0, docs, or the demo script.

## 13. WORKING WITH NON-CODERS (follow strictly)
- Run every command yourself. Ask humans only for: account logins, physical phone tests, hearing checks, measurements, PWABuilder steps in the browser, outreach and video recording.
- Never ask us to edit code or paste passwords/tokens into chat; we log in ourselves when a tool prompts.
- At every test point, output a "TEST NOW" block: URL, numbered plain-English steps, what success looks like, what failure looks like, and exactly what to send back (usually: "tap Share diagnostics and paste it here").
- When something fails, explain the root cause in plain English first, then fix it.
- After each milestone: 3–5 sentences of "What we just built and why" with one analogy, plus 2 likely judge questions with short answers. Append to docs/HOW_IT_WORKS.md.

## 14. DOCUMENTATION & JUDGE READINESS (hard requirement)
- README.md: Problem · Who it's for · The "impossible" part · How it works (Mermaid: speaker → tone → hand → echo → mic → FFT → Doppler → switch event → board → speech) · Interaction model (switch scanning) · Measured performance (our real numbers + phone model) · Impact (summary of IMPACT.md) · Honest limitations (Android/Chrome only, placement-sensitive, headphones break it, dogs and cats can hear ultrasound, screen must stay on, works only inside our app) · Install (link + APK) · Tech stack · Prior art & credits · AI usage disclosure · Team.
- docs/HOW_IT_WORKS.md: plain-English walkthrough, the physics simply, file map ("if a judge asks about X, it lives in Y").
- docs/JUDGE_QA.md: the 25 toughest questions — must include: why not the proximity sensor; hasn't Samsung/Google done this; why not voice control or camera switches; who did you talk to; accuracy and false triggers; involuntary movement; why a web app; privacy; what AI built vs what we did; what's next — with 2–3 sentence answers we can memorize.
- docs/DEMO_SCRIPT.md (≤ 2 min, impact-first): 0–10 s the impossible moment (a hand moves near a phone on a table → it says "I need water"; nobody touches it) · 10–30 s the person and the problem (from real research; consented expert voice if we have it) · 30–60 s how it works with spectrogram + proof shots (camera taped, lights off) · 60–100 s real use flow on the Talk Board · 100–120 s measured results + one-liner. Include shot list, captions, voiceover.
- docs/LIVE_DEMO_RUNBOOK.md: room and phone setup, volume, placement, a 5-minute pre-demo calibration check, and what to do if it fails live (open the Lab to show the live signal, recalibrate, then play the safety take).
- docs/SUBMISSION_CHECKLIST.md: every deliverable with a checkbox and link.

## 15. DO NOT
- Add a backend, accounts, analytics or cloud AI calls.
- Build iOS support or native Android code.
- Polish UI before Gate 1 passes.
- Claim medical efficacy, invent numbers, prices or quotes.
- Fake, stage or edit sonar behavior in any demo.
- Use copyrighted assets — icons, sounds and fonts must be original or openly licensed and credited.
- Silently change decisions in this brief. If something is blocked, explain the trade-offs and recommend a path.

Start with section 0.
