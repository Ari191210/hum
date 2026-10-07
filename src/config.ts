// Every tunable constant lives here, so tuning never means hunting through the code.
// Values marked "hypothesis" are starting points to be confirmed on the Moto G57 5G.

/** We ask the browser for 48 kHz. The phone may give us something else; we always read back the real value. */
export const REQUESTED_SAMPLE_RATE = 48_000

/**
 * Microphone settings. Echo cancellation, noise suppression and auto-gain are built for phone calls:
 * they would treat our own ultrasonic tone as "echo" or "noise" and erase it. So all three must be OFF.
 */
export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
}

// ---- Pilot tone ----------------------------------------------------------

/** Default inaudible tone. Most adults can't hear above ~17 kHz; teens sometimes can up to ~19 kHz. */
export const DEFAULT_CARRIER_HZ = 19_500
export const CARRIER_MIN_HZ = 18_000
export const CARRIER_MAX_HZ = 21_500
/** Keep the analysis band safely below the highest frequency the sample rate can represent (half of it). */
export const NYQUIST_MARGIN_HZ = 800
/** Tone loudness, 0–1 of the phone's full output. Capped so the tweeter doesn't distort into audible clicks. */
export const DEFAULT_TONE_GAIN = 0.5
export const MAX_TONE_GAIN = 0.8
/** Fade the tone in/out over this long to avoid an audible click. */
export const TONE_FADE_S = 0.1

// ---- Spectrum analysis ---------------------------------------------------

/** 8192 samples ≈ 170 ms of sound per analysis, giving ≈ 5.9 Hz resolution at 48 kHz. */
export const FFT_SIZE = 8192
/** Look for the tone's peak within this distance of where we expect it. */
export const PILOT_SEARCH_HZ = 12
/**
 * Guard band: the tone itself is not a perfectly thin line in the spectrum; it spills into neighbouring bins.
 * We ignore ±GUARD_HZ around it so the tone's own spill isn't mistaken for movement. (hypothesis)
 */
export const GUARD_HZ = 30
/** Doppler band: a hand moving at up to ~2 m/s shifts a 19.5 kHz echo by up to ~230 Hz. */
export const DOPPLER_BAND_HZ = 250
/** Quiet reference band used to estimate background noise, as an offset from the tone. */
export const NOISE_BAND_FROM_HZ = 300
export const NOISE_BAND_TO_HZ = 600
/** Values below this (or silence, which the browser reports as -Infinity) are treated as this floor. */
export const DB_FLOOR = -160

// ---- Lab display ---------------------------------------------------------

/** The Lab zooms into ±this many Hz around the tone. */
export const VIEW_SPAN_HZ = 500
export const SPECTRO_DB_MIN = -130
export const SPECTRO_DB_MAX = -30
/** How often on-screen numbers refresh (the graphs refresh every frame). */
export const READOUT_INTERVAL_MS = 200

// ---- Self-test & placement test ------------------------------------------

export const SWEEP_CARRIERS_HZ = [18_000, 18_500, 19_000, 19_500, 20_000, 20_500, 21_000, 21_500]
export const SWEEP_SETTLE_MS = 250
export const SWEEP_MEASURE_MS = 400
export const HAND_TEST_IDLE_MS = 6_000
export const HAND_TEST_MOVE_MS = 6_000
/** Pilot signal-to-noise thresholds in dB. (hypothesis) */
export const SNR_PASS_DB = 25
export const SNR_WARN_DB = 15
/** How much louder (dB) the echo spread must be while moving than while still. (hypothesis) */
export const HAND_CONTRAST_PASS_DB = 6
export const HAND_CONTRAST_WARN_DB = 3
/** Idle wobble above this many dB suggests something nearby is moving or noisy. (hypothesis) */
export const IDLE_SPREAD_WARN_DB = 10

// ---- Diagnostics ---------------------------------------------------------

export const HISTORY_SECONDS = 30
export const HISTORY_RATE_HZ = 10
export const EVENT_LOG_MAX = 200
