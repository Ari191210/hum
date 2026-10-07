import { logEvent } from '../diagnostics/eventLog'
import { SonarEngine } from './sonarEngine'
import { SonarMonitor } from './sonarMonitor'

/** One engine + monitor for the whole app, shared by every screen. */
export const engine = new SonarEngine()
export const monitor = new SonarMonitor(engine)

// Silence the tone when the app goes to the background; bring it back when the user returns.
document.addEventListener('visibilitychange', () => {
  logEvent(`page ${document.visibilityState}`)
  if (document.visibilityState === 'hidden') void engine.pause()
  else void engine.resume()
})
