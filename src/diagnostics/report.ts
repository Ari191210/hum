import type { SonarEngine } from '../audio/sonarEngine'
import type { SonarMonitor } from '../audio/sonarMonitor'
import { BUILD } from '../build'
import * as cfg from '../config'
import { round } from '../dsp/stats'
import { detectBrowser } from '../platform/browser'
import { getEventLog } from './eventLog'
import type { HandTestResult } from './scoring'
import type { SelfTestResult } from './tests'

/** Results kept in memory for the current session, so Share diagnostics can include them. */
export const sessionResults: { selfTests: SelfTestResult[]; handTests: HandTestResult[] } = {
  selfTests: [],
  handTests: [],
}

/**
 * Compact JSON a tester can paste into the chat. Numbers only: no audio is ever included.
 * Feature history is stored as parallel arrays (10 per second, last 30 s) to keep it short.
 */
export function buildDiagnostics(engine: SonarEngine, monitor: SonarMonitor): string {
  const h = monitor.getHistory()
  const t0 = h[0]?.t ?? 0
  const col = (pick: (s: (typeof h)[number]) => number, digits = 1) => h.map((s) => round(pick(s), digits))
  const report = {
    kind: 'hum-diagnostics',
    build: BUILD,
    at: new Date().toISOString(),
    device: {
      userAgent: navigator.userAgent,
      browser: detectBrowser(navigator.userAgent),
      screen: `${screen.width}x${screen.height}@${devicePixelRatio}`,
    },
    engine: {
      state: engine.state,
      error: engine.error,
      sampleRate: engine.sampleRate,
      carrierHz: engine.carrierHz,
      toneGain: engine.toneGain,
      mic: { label: engine.micLabel, settings: engine.micSettings },
      wakeLock: engine.wakeLockActive,
    },
    thresholds: {
      fftSize: cfg.FFT_SIZE,
      guardHz: cfg.GUARD_HZ,
      dopplerBandHz: cfg.DOPPLER_BAND_HZ,
      snrPassDb: cfg.SNR_PASS_DB,
      handContrastPassDb: cfg.HAND_CONTRAST_PASS_DB,
    },
    selfTests: sessionResults.selfTests,
    handTests: sessionResults.handTests,
    history: {
      rateHz: cfg.HISTORY_RATE_HZ,
      t: col((s) => (s.t - t0) / 1000),
      carrier: col((s) => s.carrierHz, 0),
      snr: col((s) => s.snrDb),
      motion: col((s) => s.motionDb),
      above: col((s) => s.aboveDb),
      below: col((s) => s.belowDb),
      velocity: col((s) => s.velocity, 2),
    },
    log: getEventLog(),
  }
  return JSON.stringify(report)
}
