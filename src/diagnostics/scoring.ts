import {
  HAND_CONTRAST_PASS_DB,
  HAND_CONTRAST_WARN_DB,
  IDLE_SPREAD_WARN_DB,
  SNR_PASS_DB,
  SNR_WARN_DB,
} from '../config'
import type { SonarFeatures } from '../dsp/spectrum'
import { median, percentile, round } from '../dsp/stats'

export type CheckStatus = 'PASS' | 'WARN' | 'FAIL'

export interface CheckResult {
  id: string
  label: string
  status: CheckStatus
  value: string
  /** One-line fix, shown only when not PASS. */
  fix: string | null
}

export interface SweepPoint {
  carrierHz: number
  snrDb: number
  pilotDb: number
}

export interface HandTestResult {
  placement: string
  carrierHz: number
  snrDb: number
  /** Typical echo spread while still (median) and its high end (95th percentile), dB relative to tone. */
  idleMedianDb: number
  idleP95Db: number
  /** Echo spread while moving: the upper quarter of frames (a wave isn't moving every instant). */
  moveP75Db: number
  /** moveP75 − idleP95: how clearly movement stands out above stillness. The Gate 1 number. */
  contrastDb: number
  /** Share of moving frames with velocity above/below zero, to show both directions were seen. */
  towardShare: number
  awayShare: number
  status: CheckStatus
}

export function bestSweepPoint(points: readonly SweepPoint[]): SweepPoint | null {
  return points.reduce<SweepPoint | null>((best, p) => (!best || p.snrDb > best.snrDb ? p : best), null)
}

export function summariseSweepStep(carrierHz: number, frames: readonly SonarFeatures[]): SweepPoint {
  return {
    carrierHz,
    snrDb: round(median(frames.map((f) => f.snrDb))),
    pilotDb: round(median(frames.map((f) => f.pilotDb))),
  }
}

export function scoreHandTest(
  placement: string,
  carrierHz: number,
  idle: readonly SonarFeatures[],
  move: readonly SonarFeatures[],
): HandTestResult {
  const idleMotion = idle.map((f) => f.motionDb)
  const moveMotion = move.map((f) => f.motionDb)
  const idleP95 = percentile(idleMotion, 0.95)
  const moveP75 = percentile(moveMotion, 0.75)
  const contrast = moveP75 - idleP95
  const active = move.filter((f) => f.motionDb > idleP95)
  const share = (pred: (v: number) => boolean) => (active.length ? active.filter((f) => pred(f.velocity)).length / active.length : 0)
  return {
    placement,
    carrierHz,
    snrDb: round(median([...idle, ...move].map((f) => f.snrDb))),
    idleMedianDb: round(median(idleMotion)),
    idleP95Db: round(idleP95),
    moveP75Db: round(moveP75),
    contrastDb: round(contrast),
    towardShare: round(share((v) => v > 0.2), 2),
    awayShare: round(share((v) => v < -0.2), 2),
    status: Number.isNaN(contrast)
      ? 'FAIL'
      : contrast >= HAND_CONTRAST_PASS_DB
        ? 'PASS'
        : contrast >= HAND_CONTRAST_WARN_DB
          ? 'WARN'
          : 'FAIL',
  }
}

export function checkSampleRate(sampleRate: number | null): CheckResult {
  const ok = sampleRate !== null && sampleRate >= 44_100
  return {
    id: 'sample-rate',
    label: 'Sample rate',
    status: sampleRate === 48_000 ? 'PASS' : ok ? 'WARN' : 'FAIL',
    value: sampleRate ? `${sampleRate} Hz` : 'unknown',
    fix:
      sampleRate === 48_000
        ? null
        : ok
          ? 'Works, but 48 kHz gives more room for the tone. Nothing to do.'
          : 'Audio runs too slowly for ultrasound on this browser. Use Chrome.',
  }
}

/** Chrome may report echo cancellation as true/false or as a mode string ("all", "remote-only"). */
export function checkVoiceProcessing(s: MediaTrackSettings | null): CheckResult {
  const flags = [s?.echoCancellation, s?.noiseSuppression, s?.autoGainControl]
  const on = flags.some((f) => f === true || (typeof f === 'string' && f !== 'none'))
  const unknown = flags.some((f) => f === undefined)
  return {
    id: 'voice-processing',
    label: 'Call processing off',
    status: on ? 'FAIL' : unknown ? 'WARN' : 'PASS',
    value: `echo ${fmt(flags[0])}, noise ${fmt(flags[1])}, gain ${fmt(flags[2])}`,
    fix: on
      ? 'The phone is cleaning up the mic like a phone call, which can erase the tone. Update Chrome and close call apps.'
      : unknown
        ? 'Chrome did not say. The tone test below is the real proof.'
        : null,
  }
}

function fmt(v: unknown): string {
  return v === undefined ? '?' : v === true ? 'ON' : v === false ? 'off' : String(v)
}

export function checkPilot(best: SweepPoint | null): CheckResult {
  const snr = best?.snrDb ?? NaN
  const status: CheckStatus = snr >= SNR_PASS_DB ? 'PASS' : snr >= SNR_WARN_DB ? 'WARN' : 'FAIL'
  return {
    id: 'pilot',
    label: 'Tone heard by mic',
    status,
    value: best ? `${best.snrDb} dB above noise at ${best.carrierHz} Hz` : 'not measured',
    fix:
      status === 'PASS'
        ? null
        : 'Turn media volume to max, unplug headphones/Bluetooth, and make sure no case or finger covers the bottom speaker and mic.',
  }
}

export function checkIdle(idle: readonly SonarFeatures[]): CheckResult {
  const m = idle.map((f) => f.motionDb)
  const spread = percentile(m, 0.95) - median(m)
  return {
    id: 'idle',
    label: 'Steady when still',
    status: Number.isNaN(spread) ? 'FAIL' : spread <= IDLE_SPREAD_WARN_DB ? 'PASS' : 'WARN',
    value: Number.isNaN(spread) ? 'no data' : `wobble ${round(spread)} dB`,
    fix: spread <= IDLE_SPREAD_WARN_DB ? null : 'Something nearby is moving or noisy (fan, people, music). Try a calmer spot.',
  }
}

export function checkHand(h: HandTestResult): CheckResult {
  return {
    id: 'hand',
    label: 'Hand movement visible',
    status: h.status,
    value: `${h.contrastDb} dB stronger than still`,
    fix: h.status === 'PASS' ? null : 'Try another placement in the Lab (Placement test), or move your hand closer and faster.',
  }
}
