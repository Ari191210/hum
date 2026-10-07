import { MIC_CONSTRAINTS, PHONE_CHECK_LISTEN_MS, REQUESTED_SAMPLE_RATE } from '../config'

/**
 * The M0 "phone check": answers the riskiest unknowns on a real phone before any sonar code exists.
 * - Does the audio engine really run at 48 kHz? (Our ultrasonic tone needs a high sample rate.)
 * - Does Chrome honour "echo cancellation OFF"? If not, it may erase our own tone.
 * - Is sound actually arriving from the mic?
 */
export interface PhoneCheckReport {
  ok: boolean
  error: string | null
  audio: {
    requestedSampleRate: number
    actualSampleRate: number | null
    baseLatencyMs: number | null
    outputLatencyMs: number | null
  }
  mic: {
    label: string | null
    /** What the browser says it actually applied. These are the values that matter. */
    settings: MediaTrackSettings | null
    capabilities: MediaTrackCapabilities | null
    /** Average loudness of the room over the listen window, in dB relative to full scale (0 = max). */
    levelDbfs: number | null
  }
  features: {
    wakeLock: boolean
    vibrate: boolean
    share: boolean
    speechVoices: string[]
  }
}

function round(n: number, digits = 1): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

function createContext(): AudioContext {
  try {
    return new AudioContext({ sampleRate: REQUESTED_SAMPLE_RATE, latencyHint: 'interactive' })
  } catch {
    // Some devices refuse an explicit rate; fall back to whatever the hardware prefers.
    return new AudioContext({ latencyHint: 'interactive' })
  }
}

/** Voices load asynchronously in Chrome; wait briefly for them. */
function loadVoices(timeoutMs = 1_500): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length > 0) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices())
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, timeoutMs)
  })
}

async function measureLevel(ctx: AudioContext, stream: MediaStream): Promise<number> {
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  source.connect(analyser)
  const buf = new Float32Array(analyser.fftSize)
  let sumSquares = 0
  let count = 0
  const end = performance.now() + PHONE_CHECK_LISTEN_MS
  while (performance.now() < end) {
    await new Promise((r) => setTimeout(r, 50))
    analyser.getFloatTimeDomainData(buf)
    for (const v of buf) sumSquares += v * v
    count += buf.length
  }
  source.disconnect()
  const rms = Math.sqrt(sumSquares / Math.max(count, 1))
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity
}

/** Must be called from a tap (browsers only allow audio after a user gesture). */
export async function runPhoneCheck(): Promise<PhoneCheckReport> {
  const report: PhoneCheckReport = {
    ok: false,
    error: null,
    audio: { requestedSampleRate: REQUESTED_SAMPLE_RATE, actualSampleRate: null, baseLatencyMs: null, outputLatencyMs: null },
    mic: { label: null, settings: null, capabilities: null, levelDbfs: null },
    features: {
      wakeLock: 'wakeLock' in navigator,
      vibrate: 'vibrate' in navigator,
      share: 'share' in navigator,
      speechVoices: [],
    },
  }

  let ctx: AudioContext | null = null
  let stream: MediaStream | null = null
  try {
    ctx = createContext()
    await ctx.resume()
    report.audio.actualSampleRate = ctx.sampleRate
    report.audio.baseLatencyMs = round(ctx.baseLatency * 1000)
    report.audio.outputLatencyMs = 'outputLatency' in ctx ? round(ctx.outputLatency * 1000) : null

    if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use the microphone (needs HTTPS + Chrome).')
    stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS, video: false })
    const track = stream.getAudioTracks()[0]
    if (!track) throw new Error('Microphone opened but gave no audio track.')
    report.mic.label = track.label
    report.mic.settings = track.getSettings()
    report.mic.capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : null
    const level = await measureLevel(ctx, stream)
    report.mic.levelDbfs = Number.isFinite(level) ? round(level) : null

    const voices = await loadVoices()
    report.features.speechVoices = voices
      .filter((v) => /^(en|hi)/i.test(v.lang))
      .map((v) => `${v.lang} | ${v.name}`)

    report.ok = true
  } catch (err) {
    report.error = describeError(err)
  } finally {
    stream?.getTracks().forEach((t) => t.stop())
    await ctx?.close().catch(() => undefined)
  }
  return report
}

function describeError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'Microphone permission was denied. Tap the lock icon in the address bar → Permissions → Microphone → Allow, then try again.'
    if (err.name === 'NotFoundError') return 'No microphone was found.'
    if (err.name === 'NotReadableError') return 'The microphone is busy (another app may be using it). Close other apps and try again.'
    return `${err.name}: ${err.message}`
  }
  return err instanceof Error ? err.message : String(err)
}
