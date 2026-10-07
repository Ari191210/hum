import {
  CARRIER_MAX_HZ,
  CARRIER_MIN_HZ,
  DEFAULT_CARRIER_HZ,
  DEFAULT_TONE_GAIN,
  FFT_SIZE,
  MAX_TONE_GAIN,
  MIC_CONSTRAINTS,
  NYQUIST_MARGIN_HZ,
  REQUESTED_SAMPLE_RATE,
  TONE_FADE_S,
} from '../config'
import { logEvent } from '../diagnostics/eventLog'
import { maxCarrierFor, type Geometry } from '../dsp/spectrum'
import { describeAudioError } from './errors'

export type EngineState = 'idle' | 'starting' | 'running' | 'paused' | 'error'

/**
 * Audio I/O for the sonar: plays the inaudible pilot tone through the speaker and feeds the
 * microphone into an FFT analyser. Contains no detection logic: that lives in src/dsp and src/gestures.
 */
export class SonarEngine {
  state: EngineState = 'idle'
  error: string | null = null
  carrierHz = DEFAULT_CARRIER_HZ
  toneGain = DEFAULT_TONE_GAIN
  micSettings: MediaTrackSettings | null = null
  micLabel: string | null = null
  wakeLockActive = false

  private ctx: AudioContext | null = null
  private osc: OscillatorNode | null = null
  private gain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private stream: MediaStream | null = null
  private wakeLock: WakeLockSentinel | null = null
  private spectrum: Float32Array<ArrayBuffer> | null = null
  private listeners = new Set<() => void>()

  get sampleRate(): number | null {
    return this.ctx?.sampleRate ?? null
  }

  get geometry(): Geometry | null {
    return this.ctx ? { sampleRate: this.ctx.sampleRate, fftSize: FFT_SIZE } : null
  }

  get carrierRange(): { min: number; max: number } {
    const sr = this.sampleRate ?? REQUESTED_SAMPLE_RATE
    return { min: CARRIER_MIN_HZ, max: Math.min(CARRIER_MAX_HZ, maxCarrierFor(sr, NYQUIST_MARGIN_HZ)) }
  }

  /** Notified whenever state, carrier or gain changes. */
  onChange(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn())
  }

  /** Must be called from a tap: browsers only allow sound after a user gesture. */
  async start(): Promise<void> {
    if (this.state === 'running' || this.state === 'starting') return
    this.state = 'starting'
    this.error = null
    this.emit()
    try {
      // Create the AudioContext before any `await`, while the browser still counts this as part of the tap.
      this.ctx = this.createContext()
      await this.ctx.resume()
      logEvent(`audio context ${this.ctx.sampleRate} Hz, base latency ${Math.round(this.ctx.baseLatency * 1000)} ms`)

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser cannot use the microphone. Use Chrome on Android over https://.')
      }
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS, video: false })
      const track = this.stream.getAudioTracks()[0]
      if (!track) throw new Error('The microphone opened but gave no audio.')
      this.micSettings = track.getSettings()
      this.micLabel = track.label
      track.addEventListener('ended', () => this.fail('The microphone stopped (another app may have taken it).'))
      logEvent(`mic "${track.label}" EC=${this.micSettings.echoCancellation} NS=${this.micSettings.noiseSuppression} AGC=${this.micSettings.autoGainControl}`)

      // Microphone → analyser. Never connected to the speaker (that would cause feedback).
      const source = this.ctx.createMediaStreamSource(this.stream)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = FFT_SIZE
      this.analyser.smoothingTimeConstant = 0 // raw frames; we do our own smoothing
      source.connect(this.analyser)
      this.spectrum = new Float32Array(this.analyser.frequencyBinCount)

      // Pilot tone → gain (for click-free fades) → speaker.
      this.carrierHz = this.clampCarrier(this.carrierHz)
      this.osc = this.ctx.createOscillator()
      this.osc.type = 'sine'
      this.osc.frequency.value = this.carrierHz
      this.gain = this.ctx.createGain()
      this.gain.gain.value = 0
      this.osc.connect(this.gain).connect(this.ctx.destination)
      this.osc.start()
      this.fadeTo(this.toneGain)

      this.ctx.addEventListener('statechange', () => logEvent(`audio context → ${this.ctx?.state}`))
      await this.acquireWakeLock()
      this.state = 'running'
      logEvent(`sonar running at ${this.carrierHz} Hz, gain ${this.toneGain}`)
    } catch (err) {
      this.fail(describeAudioError(err))
      await this.teardown()
    }
    this.emit()
  }

  /** Latest spectrum in dB per bin, or null if not running. Reuses one buffer to avoid garbage. */
  readSpectrum(): Float32Array | null {
    if (!this.analyser || !this.spectrum || this.state !== 'running') return null
    this.analyser.getFloatFrequencyData(this.spectrum)
    return this.spectrum
  }

  setCarrier(hz: number): void {
    this.carrierHz = this.clampCarrier(hz)
    if (this.osc && this.ctx) this.osc.frequency.setTargetAtTime(this.carrierHz, this.ctx.currentTime, 0.01)
    this.emit()
  }

  setToneGain(g: number): void {
    this.toneGain = Math.min(Math.max(g, 0), MAX_TONE_GAIN)
    if (this.state === 'running') this.fadeTo(this.toneGain)
    this.emit()
  }

  /** Short audible beep for test instructions. Well below the sonar band, so it doesn't look like motion. */
  beep(freq = 880, ms = 120): void {
    if (!this.ctx || this.state !== 'running') return
    const t = this.ctx.currentTime
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.25, t + 0.01)
    g.gain.linearRampToValueAtTime(0, t + ms / 1000)
    o.connect(g).connect(this.ctx.destination)
    o.start(t)
    o.stop(t + ms / 1000 + 0.02)
  }

  /** Called when the app is hidden: silence the tone and release the screen. */
  async pause(): Promise<void> {
    if (this.state !== 'running' || !this.ctx) return
    this.fadeTo(0)
    await new Promise((r) => setTimeout(r, TONE_FADE_S * 1000 + 20))
    await this.ctx.suspend().catch(() => undefined)
    await this.releaseWakeLock()
    this.state = 'paused'
    logEvent('paused (app hidden)')
    this.emit()
  }

  async resume(): Promise<void> {
    if (this.state !== 'paused' || !this.ctx) return
    try {
      await this.ctx.resume()
      this.fadeTo(this.toneGain)
      await this.acquireWakeLock()
      this.state = 'running'
      logEvent('resumed')
    } catch (err) {
      this.fail(describeAudioError(err))
    }
    this.emit()
  }

  async stop(): Promise<void> {
    if (this.state === 'running') {
      this.fadeTo(0)
      await new Promise((r) => setTimeout(r, TONE_FADE_S * 1000 + 20))
    }
    await this.teardown()
    this.state = 'idle'
    logEvent('stopped')
    this.emit()
  }

  private createContext(): AudioContext {
    try {
      return new AudioContext({ sampleRate: REQUESTED_SAMPLE_RATE, latencyHint: 'interactive' })
    } catch {
      logEvent('48 kHz refused, using device default rate')
      return new AudioContext({ latencyHint: 'interactive' })
    }
  }

  private clampCarrier(hz: number): number {
    const { min, max } = this.carrierRange
    return Math.min(Math.max(hz, min), max)
  }

  private fadeTo(target: number): void {
    if (!this.gain || !this.ctx) return
    const t = this.ctx.currentTime
    this.gain.gain.cancelScheduledValues(t)
    this.gain.gain.setValueAtTime(this.gain.gain.value, t)
    this.gain.gain.linearRampToValueAtTime(target, t + TONE_FADE_S)
  }

  private async acquireWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) return
    try {
      this.wakeLock = await navigator.wakeLock.request('screen')
      this.wakeLockActive = true
      this.wakeLock.addEventListener('release', () => {
        this.wakeLockActive = false
        this.emit()
      })
    } catch (err) {
      this.wakeLockActive = false
      logEvent(`wake lock unavailable: ${describeAudioError(err)}`)
    }
  }

  private async releaseWakeLock(): Promise<void> {
    await this.wakeLock?.release().catch(() => undefined)
    this.wakeLock = null
    this.wakeLockActive = false
  }

  private fail(message: string): void {
    this.state = 'error'
    this.error = message
    logEvent(`error: ${message}`)
    this.emit()
  }

  private async teardown(): Promise<void> {
    try {
      this.osc?.stop()
    } catch {
      /* already stopped */
    }
    this.stream?.getTracks().forEach((t) => t.stop())
    await this.releaseWakeLock()
    await this.ctx?.close().catch(() => undefined)
    this.ctx = this.osc = this.gain = this.analyser = this.stream = this.spectrum = null
  }
}
