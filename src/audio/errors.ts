/** Turns browser audio/permission errors into one plain-English sentence with a fix. */
export function describeAudioError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        return 'Microphone permission was denied. Tap the icon left of the address bar → Permissions → Microphone → Allow, then try again.'
      case 'NotFoundError':
        return 'No microphone was found on this device.'
      case 'NotReadableError':
        return 'The microphone is busy (another app may be using it, e.g. a call or recorder). Close other apps and try again.'
      case 'SecurityError':
        return 'The browser blocked the microphone. Open the app over https:// in Chrome.'
      default:
        return `${err.name}: ${err.message}`
    }
  }
  return err instanceof Error ? err.message : String(err)
}
