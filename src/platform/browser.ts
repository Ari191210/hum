export interface BrowserInfo {
  isAndroid: boolean
  isChrome: boolean
  /** True only for Chrome on Android, the one platform Hum supports. */
  supported: boolean
  chromeVersion: number | null
}

/**
 * Detects Chrome on Android from the user-agent string.
 * Other Chromium browsers (Edge, Samsung Internet, Opera…) put their own token in the UA; we exclude them
 * because their audio stacks differ and we have not tested them.
 */
export function detectBrowser(userAgent: string): BrowserInfo {
  const isAndroid = /Android/i.test(userAgent)
  const otherChromium = /(EdgA?|SamsungBrowser|OPR|Opera|YaBrowser|UCBrowser|Firefox|FxiOS|wv\))/i.test(userAgent)
  const match = /Chrome\/(\d+)/.exec(userAgent)
  const isChrome = match !== null && !otherChromium
  const chromeVersion = isChrome && match?.[1] ? Number(match[1]) : null
  return { isAndroid, isChrome, supported: isAndroid && isChrome, chromeVersion }
}
