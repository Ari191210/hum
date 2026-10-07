# PROGRESS

> New session? Read `CLAUDE.md` (the brief) first, then this file, then continue from "Next step".

**Next step:** M0 in progress.
**Current deploy URL:** none yet
**Phone test URL:** none yet
**App name:** Hum · **Demo phone:** Moto G57 5G
**Competition start:** at or before 2026-10-07 09:26 IST · **Deadline:** < 48 h from start, exact time TBD · **Feature freeze:** hour 40 or deadline − 8 h, whichever is earlier

## Milestones

- [ ] **M0** (0–1h) scaffold, git, CLAUDE.md, PROGRESS.md, Vercel + HTTPS phone loop, outreach draft
  - [x] CLAUDE.md saved verbatim
  - [x] PROGRESS.md created
  - [x] Environment checked (see below)
  - [x] Team "go" received (2026-10-07 09:26 IST): name **Hum**, demo phone **Moto G57 5G**
  - [ ] Vite + React + TS scaffold, first commit, public GitHub repo
  - [ ] Vercel project linked, auto-deploy on push
  - [ ] HTTPS phone loop (Cloudflare quick tunnel) documented as one routine
  - [ ] Outreach message + interview guide drafted (docs/OUTREACH.md)
- [ ] **M1** (1–3h) Lab + self-test + diagnostics + placement test → **Gate 1**
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
- Project folder: `C:/Users/DELL/batmode` (git initialised, branch `main`, **no commits yet** — first commit waits for competition start)

## Decisions

- 2026-10-07: App name **Hum** (team choice). Local folder stays `batmode`; GitHub repo is `Ari191210/hum`.
- 2026-10-07: Demo phone is Moto G57 5G.

## Measured results

_None yet. Every number here must come from a real device test._

| Metric | Value | Phone | Placement | Carrier | Date |
|---|---|---|---|---|---|

## Open issues

- Exact submission deadline not yet known (needed to fix the feature-freeze time).
- Team phone models unknown — needed for the placement and carrier sweep.
