import { describe, expect, it } from 'vitest'
import { extractFeatures, freqToBin, maxCarrierFor, type Geometry } from './spectrum'
import { median, percentile } from './stats'

const G: Geometry = { sampleRate: 48_000, fftSize: 8192 }
const CARRIER = 19_500

/** Builds a synthetic spectrum: flat noise floor plus a tone, plus optional extra energy in a frequency range. */
function synth(opts: { floorDb?: number; pilotDb?: number; extra?: { fromHz: number; toHz: number; db: number }[] } = {}) {
  const s = new Float32Array(G.fftSize / 2).fill(opts.floorDb ?? -120)
  const c = freqToBin(G, CARRIER)
  s[c] = opts.pilotDb ?? -30
  // Real tones leak into neighbouring bins (window main lobe).
  s[c - 1] = s[c + 1] = (opts.pilotDb ?? -30) - 8
  s[c - 2] = s[c + 2] = (opts.pilotDb ?? -30) - 25
  for (const e of opts.extra ?? []) {
    for (let b = freqToBin(G, e.fromHz); b <= freqToBin(G, e.toHz); b++) s[b] = e.db
  }
  return s
}

describe('extractFeatures', () => {
  it('finds the tone and measures a clean signal-to-noise ratio when nothing moves', () => {
    const f = extractFeatures(synth(), G, CARRIER)
    expect(Math.abs(f.pilotHz - CARRIER)).toBeLessThan(6)
    expect(f.pilotDb).toBe(-30)
    expect(f.noiseDb).toBe(-120)
    expect(f.snrDb).toBe(90)
    expect(f.motionDb).toBeLessThan(-60)
  })

  it('reports energy above the tone (velocity > 0) for a hand moving toward the phone', () => {
    const still = extractFeatures(synth(), G, CARRIER)
    const moving = extractFeatures(synth({ extra: [{ fromHz: CARRIER + 60, toHz: CARRIER + 160, db: -70 }] }), G, CARRIER)
    expect(moving.motionDb).toBeGreaterThan(still.motionDb + 20)
    expect(moving.aboveDb).toBeGreaterThan(moving.belowDb + 20)
    expect(moving.velocity).toBeGreaterThan(0.9)
  })

  it('reports energy below the tone (velocity < 0) for a hand moving away', () => {
    const f = extractFeatures(synth({ extra: [{ fromHz: CARRIER - 160, toHz: CARRIER - 60, db: -70 }] }), G, CARRIER)
    expect(f.velocity).toBeLessThan(-0.9)
  })

  it('ignores energy inside the guard band (the tone spilling into neighbouring bins)', () => {
    const f = extractFeatures(synth({ extra: [{ fromHz: CARRIER + 12, toHz: CARRIER + 20, db: -45 }] }), G, CARRIER)
    expect(f.motionDb).toBeLessThan(-60)
  })

  it('tracks a tone that lands a bin or two away from where we expected it', () => {
    const f = extractFeatures(synth(), G, CARRIER + 8)
    expect(Math.abs(f.pilotHz - CARRIER)).toBeLessThan(6)
  })

  it('treats silence (-Infinity from the browser) as the floor instead of producing NaN', () => {
    const s = new Float32Array(G.fftSize / 2).fill(-Infinity)
    const f = extractFeatures(s, G, CARRIER)
    expect(Number.isNaN(f.snrDb)).toBe(false)
    expect(Number.isNaN(f.velocity)).toBe(false)
  })

  it('keeps the highest carrier below half the sample rate with margin', () => {
    expect(maxCarrierFor(48_000, 800)).toBe(23_200)
    expect(maxCarrierFor(44_100, 800)).toBe(21_250)
  })
})

describe('stats', () => {
  it('computes median and percentiles', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(percentile([0, 10], 0.95)).toBeCloseTo(9.5)
    expect(Number.isNaN(median([]))).toBe(true)
  })
})
