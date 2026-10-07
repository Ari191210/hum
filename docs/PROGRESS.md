# PROGRESS

> New session? Read `CLAUDE.md` (the brief) first, then this file, then continue from "Next step".

**Next step:** team runs self-test + placement tests A–D on the Moto G57 5G and pastes Share diagnostics → decide Gate 1 → M2 (MOTION detector).
**Current deploy URL:** https://hum-switch.vercel.app (auto-deploys on every push to `main`)
**Phone test URL:** same as above. For fast tuning: `npm run phone` prints a trycloudflare.com link
**App name:** Hum · **Demo phone:** Moto G57 5G
**Competition start:** at or before 2026-10-07 09:26 IST · **Deadline:** 2026-10-09 23:00 IST · **Feature freeze:** 2026-10-09 ~01:30 IST (hour 40 — earlier than deadline − 8 h = 15:00)

## Milestones

- [ ] **M0** (0–1h) scaffold, git, CLAUDE.md, PROGRESS.md, Vercel + HTTPS phone loop, outreach draft
  - [x] CLAUDE.md saved verbatim
  - [x] PROGRESS.md created
  - [x] Environment checked (see below)
  - [x] Team "go" received (2026-10-07 09:26 IST): name **Hum**, demo phone **Moto G57 5G**
  - [x] Vite + React + TS (strict) scaffold, public repo https://github.com/Ari191210/hum
  - [x] Vercel project `hum-switch` linked; auto-deploy on push verified (live bundle stamp = latest commit aa5aa10)
  - [x] HTTPS phone loop: Vercel URL (main routine) + `npm run phone` quick tunnel (verified, Vite allow-list OK)
  - [x] Outreach message + interview guide drafted (docs/OUTREACH.md)
  - [x] Phone-check screen (sample rate, EC/NS/AGC actually applied, mic level, voices, Share diagnostics)
  - [~] Phone check superseded by M1 self-test (team never ran M0 check)
- [ ] **M1** (1–3h) Lab + self-test + diagnostics + placement test → **Gate 1**
  - [x] SonarEngine (tone, raw mic → FFT 8192, fades, wake lock, pause on hidden)
  - [x] Doppler features (pilot SNR, echo spread above/below, velocity) + 13 unit tests
  - [x] Lab: zoomed spectrum, scrolling spectrogram, readouts, carrier + tone-level sliders
  - [x] Self-test (~20 s, PASS/WARN/FAIL with fixes) incl. carrier sweep 18–21.5 kHz
  - [x] Placement test A–D with results table; Share diagnostics (JSON, last 30 s features, log)
  - [x] Desktop checks: headless Chrome smoke test (no crashes); in-browser loopback: still −74 dB spread, simulated echo −40 dB, direction sign correct
  - [ ] Moto G57 5G self-test + placements (waiting on team)
- [ ] **M2** (3–8h) MOTION detector, baselines, recording/replay, tests → **Gate 2**
- [ ] **M3** (8–16h) Talk Board + scanning + speech on SwitchSource; calibration wizard
- [ ] **M4** (16–20h) end-to-end on demo phone + measurement mode → SAFETY TAKE
- [ ] **M5** (20–28h) settings, robust states, PWA, APK, installed-app test
- [ ] **M6** (28–36h) polish, accessibility audit, stretch gestures (only if P0/P1 solid)
- [ ] **M7** (36–42h) docs, impact write-up, judge prep, demo script, runbook

## Gates

| Gate | Target | Result | Phone / placement | Date |
|---|---|---|---|---|
| Gate 1 | pilot clearly above noise, hand gives visible repeatable shift | — | — | — |
| Gate 2 | ≥ 90% of 20 movements; ≤ 1 false / 5 min idle; range ≥ 15 cm | — | — | — |

Fallback ladder position: not started (L0)

## Environment (checked 2026-10-07)

- Windows 11, Node v24.14.1 (LTS), npm 11.11.0, Git 2.53.0
- GitHub CLI 2.92.0, logged in as `Ari191210`
- Vercel CLI 54.5.1, logged in as `ari191210`
- cloudflared installed via winget → `C:/Program Files (x86)/cloudflared/cloudflared.exe`
- Project folder: `C:/Users/DELL/batmode` (branch `main`, first commit 2026-10-07 ~09:27 IST)
- Stack versions: Vite 8.3, React 19.3, TypeScript 6.0 (strict + noUncheckedIndexedAccess), Vitest 5

## Decisions

- 2026-10-07: App name **Hum** (team choice). Local folder stays `batmode`; GitHub repo is `Ari191210/hum`.
- 2026-10-07: Demo phone is Moto G57 5G.
- 2026-10-07: **Final domain is `hum-switch.vercel.app`.** Do not change it: the M5 APK (TWA) and assetlinks.json are tied to this domain.
- 2026-10-07: **vite-plugin-pwa deferred to M5** (sequencing, not dropped). Reason: a service worker caches old builds, which would make phones run stale code while we tune the sonar in M1–M4.
- 2026-10-07: No client-side router. Screens switch by app state, which avoids Vercel rewrite and TWA start_url problems.
- 2026-10-07: Two folders added beyond the brief's list: `src/platform` (browser detection) and `src/diagnostics` (share/export).
- 2026-10-07: Only the Moto G57 5G will be used (team decision). Ladder L1 = carriers × placements on this one phone.
- 2026-10-07: The repo has a commit-message hook that requires conventional commits (`feat:`, `fix:`, `docs:`…).

## Measured results

_None yet. Every number here must come from a real device test._

| Metric | Value | Phone | Placement | Carrier | Date |
|---|---|---|---|---|---|

## Open issues

- Exact submission deadline not yet known (needed to fix the feature-freeze time).
- Researcher has not started outreach yet (as of 09:50 IST day 1).
- Laptop speaker/mic can't carry the tone (sweep ≤ 6.5 dB SNR); all acoustic testing must happen on the Moto.
