// Every tunable constant lives here, so tuning never means hunting through the code.

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

/** How long the phone check listens to the mic to confirm sound is flowing. */
export const PHONE_CHECK_LISTEN_MS = 1_000
