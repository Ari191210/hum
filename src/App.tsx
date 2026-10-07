import { useState } from 'react'
import { BUILD } from './build'
import { Lab } from './features/Lab'
import { SelfTest } from './features/SelfTest'
import { detectBrowser } from './platform/browser'

const browser = detectBrowser(navigator.userAgent)

type Screen = 'lab' | 'selftest'

export default function App() {
  const [screen, setScreen] = useState<Screen>('lab')
  return (
    <>
      {!browser.supported && (
        <p className="banner" role="alert">
          Hum works best on Android with Chrome. Other browsers may not work.
        </p>
      )}
      {screen === 'lab' ? <Lab onSelfTest={() => setScreen('selftest')} /> : <SelfTest onBack={() => setScreen('lab')} />}
      <footer className="build">
        build {BUILD.sha} · {BUILD.time.slice(0, 16).replace('T', ' ')} UTC
      </footer>
    </>
  )
}
