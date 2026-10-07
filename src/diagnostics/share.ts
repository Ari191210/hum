export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * Sends diagnostics text off the phone. Prefers the Android share sheet (WhatsApp, Gmail, etc.);
 * falls back to copying to the clipboard.
 */
export async function shareText(title: string, text: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // Fall through to clipboard.
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
