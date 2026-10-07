import { describe, expect, it } from 'vitest'
import { detectBrowser } from './browser'

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 15; moto g57 5G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'

describe('detectBrowser', () => {
  it('accepts Chrome on Android', () => {
    expect(detectBrowser(ANDROID_CHROME)).toEqual({
      isAndroid: true,
      isChrome: true,
      supported: true,
      chromeVersion: 141,
    })
  })

  it('rejects Samsung Internet', () => {
    const ua = ANDROID_CHROME.replace('Chrome/141', 'SamsungBrowser/27.0 Chrome/141')
    expect(detectBrowser(ua).supported).toBe(false)
  })

  it('rejects Android WebView (other apps embedding a browser)', () => {
    const ua = ANDROID_CHROME.replace('5G)', '5G; wv)')
    expect(detectBrowser(ua).supported).toBe(false)
  })

  it('rejects iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1'
    expect(detectBrowser(ua).supported).toBe(false)
  })

  it('rejects desktop Chrome', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
    expect(detectBrowser(ua)).toMatchObject({ isChrome: true, supported: false })
  })
})
