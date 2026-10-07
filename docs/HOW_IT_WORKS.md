# How Hum works (plain English)

This file grows after every milestone. Each entry has: what we built and why, an analogy, and two judge questions with short answers. A full walkthrough, the physics and a file map get added in M7.

## File map so far

| If a judge asks about… | It lives in… |
|---|---|
| Every tunable number (sample rate, mic settings…) | `src/config.ts` |
| Turning off echo cancellation and opening the mic | `src/audio/phoneCheck.ts` |
| "Best on Android + Chrome" detection | `src/platform/browser.ts` (+ tests next to it) |
| Share diagnostics button | `src/diagnostics/share.ts` |
| Which build is on the phone | `src/build.ts`, shown at the bottom of the screen |
| Phone testing over HTTPS | `scripts/phone.mjs` (quick tunnel), or just https://hum-switch.vercel.app |

---

## M0: Foundation and phone check (2026-10-07)

**What we built and why.** We set up the project, a public GitHub repo, and automatic publishing: every time code is saved to GitHub, the live site at hum-switch.vercel.app updates within about 30 seconds. The first screen is a "phone check". It opens the microphone for one second and reports whether the phone will cooperate with sonar. The key question is whether Chrome really turns off *echo cancellation*. That is a phone-call feature that would treat our own inaudible tone as an echo and erase it. Asking this on day one means we find a dead end in hour 1 instead of hour 10.

**Analogy.** Before a band plays, the sound engineer does a mic check. We are doing a mic check on the phone before we write the song.

**Judge question:** *"Why is this a website and not a 'real' app?"*
**Answer:** "A web app updates instantly on every phone with one link, which let us test dozens of versions in 48 hours. We wrap it into an Android APK for installation. Chrome on Android gives us direct access to the speaker and microphone, which is all sonar needs."

**Judge question:** *"Does it record people?"*
**Answer:** "No. The microphone is analysed live on the phone and immediately discarded. There's no server at all, so nothing can be uploaded. The only thing that ever leaves the phone is a diagnostics report when *we* tap Share during testing, and that's numbers, not audio."
