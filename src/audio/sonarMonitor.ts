import { HISTORY_RATE_HZ, HISTORY_SECONDS } from '../config'
import { extractFeatures, type SonarFeatures } from '../dsp/spectrum'
import type { SonarEngine } from './sonarEngine'

export interface Frame {
  /** ms timestamp (performance.now). */
  t: number
  carrierHz: number
  sampleRate: number
  spectrum: Float32Array
  features: SonarFeatures
}

export interface HistorySample extends SonarFeatures {
  t: number
  carrierHz: number
}

/**
 * Reads one spectrum per screen refresh (~60 per second), turns it into features, and hands each
 * frame to whoever is listening (graphs, tests, later the gesture detector). Keeps the last
 * 30 seconds of features at 10 per second for Share diagnostics.
 */
export class SonarMonitor {
  private listeners = new Set<(f: Frame) => void>()
  private raf = 0
  private history: HistorySample[] = []
  private lastHistoryT = 0

  private engine: SonarEngine

  constructor(engine: SonarEngine) {
    this.engine = engine
  }

  subscribe(fn: (f: Frame) => void): () => void {
    this.listeners.add(fn)
    if (!this.raf) this.raf = requestAnimationFrame(this.tick)
    return () => {
      this.listeners.delete(fn)
    }
  }

  getHistory(): readonly HistorySample[] {
    return this.history
  }

  /** Collects features for `ms` milliseconds. Used by the self-test and placement test. */
  collect(ms: number): Promise<SonarFeatures[]> {
    return new Promise((resolve) => {
      const out: SonarFeatures[] = []
      const end = performance.now() + ms
      const unsub = this.subscribe((f) => {
        if (f.t >= end) {
          unsub()
          resolve(out)
        } else {
          out.push(f.features)
        }
      })
      // If the app is hidden, animation frames stop; don't hang forever.
      setTimeout(() => {
        unsub()
        resolve(out)
      }, ms + 2_000)
    })
  }

  private tick = (t: number): void => {
    this.raf = this.listeners.size > 0 ? requestAnimationFrame(this.tick) : 0
    const spectrum = this.engine.readSpectrum()
    const g = this.engine.geometry
    if (!spectrum || !g) return
    const carrierHz = this.engine.carrierHz
    const features = extractFeatures(spectrum, g, carrierHz)
    if (t - this.lastHistoryT >= 1000 / HISTORY_RATE_HZ) {
      this.lastHistoryT = t
      this.history.push({ t, carrierHz, ...features })
      const cutoff = t - HISTORY_SECONDS * 1000
      while (this.history.length > 0 && (this.history[0]?.t ?? t) < cutoff) this.history.shift()
    }
    const frame: Frame = { t, carrierHz, sampleRate: g.sampleRate, spectrum, features }
    this.listeners.forEach((fn) => fn(frame))
  }
}
