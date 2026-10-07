import {
  DB_FLOOR,
  DOPPLER_BAND_HZ,
  GUARD_HZ,
  NOISE_BAND_FROM_HZ,
  NOISE_BAND_TO_HZ,
  PILOT_SEARCH_HZ,
} from '../config'
import { median } from './stats'

/**
 * Pure spectrum maths. Input: one spectrum from the browser's FFT, as decibels per frequency bin.
 * "Bin" = one narrow slice of frequency; bin i covers roughly i × (sampleRate / fftSize) Hz.
 */
export interface Geometry {
  sampleRate: number
  fftSize: number
}

export interface BandOptions {
  guardHz: number
  bandHz: number
  noiseFromHz: number
  noiseToHz: number
  searchHz: number
}

export const DEFAULT_BANDS: BandOptions = {
  guardHz: GUARD_HZ,
  bandHz: DOPPLER_BAND_HZ,
  noiseFromHz: NOISE_BAND_FROM_HZ,
  noiseToHz: NOISE_BAND_TO_HZ,
  searchHz: PILOT_SEARCH_HZ,
}

export interface SonarFeatures {
  /** Where the tone's peak actually is (Hz). */
  pilotHz: number
  /** Loudness of the tone as heard by the mic (dB). */
  pilotDb: number
  /** Background noise level near the tone (dB). */
  noiseDb: number
  /** How far the tone stands above the noise (dB). Bigger is better. */
  snrDb: number
  /** Echo energy just ABOVE the tone (hand moving toward the phone), relative to the tone (dB). */
  aboveDb: number
  /** Echo energy just BELOW the tone (hand moving away), relative to the tone (dB). */
  belowDb: number
  /** Total echo spread on both sides relative to the tone (dB). Rises when something moves. */
  motionDb: number
  /** -1 (all below → moving away) … +1 (all above → moving toward). 0 when balanced or still. */
  velocity: number
}

export const binWidth = (g: Geometry): number => g.sampleRate / g.fftSize
export const freqToBin = (g: Geometry, hz: number): number => Math.round(hz / binWidth(g))
export const binToFreq = (g: Geometry, bin: number): number => bin * binWidth(g)

export const dbToPower = (db: number): number => 10 ** (db / 10)
export const powerToDb = (p: number): number => (p > 0 ? 10 * Math.log10(p) : DB_FLOOR)

function at(spectrum: ArrayLike<number>, i: number): number {
  const v = spectrum[i]
  return v !== undefined && Number.isFinite(v) && v > DB_FLOOR ? v : DB_FLOOR
}

/** Sum of linear power over bins [from, to], clamped to the spectrum. */
function bandPower(spectrum: ArrayLike<number>, from: number, to: number): number {
  let sum = 0
  const lo = Math.max(0, from)
  const hi = Math.min(spectrum.length - 1, to)
  for (let i = lo; i <= hi; i++) sum += dbToPower(at(spectrum, i))
  return sum
}

/** Highest carrier we can use for this sample rate (tone + analysis bands must fit below half the sample rate). */
export function maxCarrierFor(sampleRate: number, marginHz: number): number {
  return sampleRate / 2 - marginHz
}

/**
 * Measures the tone and the Doppler "spread" around it.
 * Idea (from SoundWave, CHI 2012): a still room returns the tone at exactly its own pitch. A moving hand
 * returns it slightly higher (approaching) or lower (leaving), which shows up as extra energy on one
 * side of the tone. We compare that side energy to the tone's own energy.
 */
export function extractFeatures(
  spectrum: ArrayLike<number>,
  g: Geometry,
  carrierHz: number,
  bands: BandOptions = DEFAULT_BANDS,
): SonarFeatures {
  const w = binWidth(g)
  const expected = freqToBin(g, carrierHz)
  const search = Math.max(1, Math.round(bands.searchHz / w))

  let peak = expected
  for (let i = expected - search; i <= expected + search; i++) {
    if (at(spectrum, i) > at(spectrum, peak)) peak = i
  }

  const guard = Math.max(1, Math.round(bands.guardHz / w))
  const band = Math.round(bands.bandHz / w)
  const nFrom = Math.round(bands.noiseFromHz / w)
  const nTo = Math.round(bands.noiseToHz / w)

  const pilotPower = bandPower(spectrum, peak - guard, peak + guard)
  const above = bandPower(spectrum, peak + guard + 1, peak + band)
  const below = bandPower(spectrum, peak - band, peak - guard - 1)

  const noiseBins: number[] = []
  for (let i = nFrom; i <= nTo; i++) {
    noiseBins.push(at(spectrum, peak + i), at(spectrum, peak - i))
  }
  const noiseDb = median(noiseBins)
  const pilotDb = at(spectrum, peak)
  const sideTotal = above + below

  return {
    pilotHz: binToFreq(g, peak),
    pilotDb,
    noiseDb,
    snrDb: pilotDb - noiseDb,
    aboveDb: powerToDb(above) - powerToDb(pilotPower),
    belowDb: powerToDb(below) - powerToDb(pilotPower),
    motionDb: powerToDb(sideTotal) - powerToDb(pilotPower),
    velocity: sideTotal > 0 ? (above - below) / sideTotal : 0,
  }
}
