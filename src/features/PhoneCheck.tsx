import { useState } from 'react'
import { runPhoneCheck, type PhoneCheckReport } from '../audio/phoneCheck'
import { BUILD } from '../build'
import { shareText, type ShareResult } from '../diagnostics/share'
import type { BrowserInfo } from '../platform/browser'

type Status = 'idle' | 'running' | 'done'

const SHARE_MESSAGES: Record<ShareResult, string> = {
  shared: 'Sent.',
  copied: 'Copied. Paste it into the chat on the laptop.',
  cancelled: 'Cancelled.',
  failed: 'Could not share or copy. Take a screenshot of the text below instead.',
}

export function PhoneCheck({ browser }: { browser: BrowserInfo }) {
  const [status, setStatus] = useState<Status>('idle')
  const [report, setReport] = useState<PhoneCheckReport | null>(null)
  const [shareMsg, setShareMsg] = useState<string | null>(null)

  const json = report
    ? JSON.stringify({ kind: 'hum-phone-check', build: BUILD, userAgent: navigator.userAgent, browser, report }, null, 1)
    : ''

  async function start() {
    setStatus('running')
    setShareMsg(null)
    setReport(await runPhoneCheck())
    setStatus('done')
  }

  async function share() {
    setShareMsg(SHARE_MESSAGES[await shareText('Hum phone check', json)])
  }

  const s = report?.mic.settings
  return (
    <main className="screen">
      <h1>Hum · phone check</h1>
      <p className="lead">
        Checks that this phone can run Hum. It opens the microphone for one second. Nothing is recorded or sent anywhere.
      </p>

      {!browser.supported && (
        <p className="warn" role="alert">
          Hum works best on Android with Chrome. This browser may not work.
        </p>
      )}

      <button className="big" onClick={start} disabled={status === 'running'}>
        {status === 'running' ? 'Checking…' : status === 'done' ? 'Run again' : 'Start check'}
      </button>

      {report && (
        <section aria-live="polite">
          <h2>{report.ok ? 'PASS: check finished' : 'FAIL'}</h2>
          {report.error && <p className="warn">{report.error}</p>}
          <dl>
            <dt>Sample rate</dt>
            <dd>{report.audio.actualSampleRate ?? '—'} Hz</dd>
            <dt>Echo cancellation</dt>
            <dd>{fmtFlag(s?.echoCancellation)}</dd>
            <dt>Noise suppression</dt>
            <dd>{fmtFlag(s?.noiseSuppression)}</dd>
            <dt>Auto gain</dt>
            <dd>{fmtFlag(s?.autoGainControl)}</dd>
            <dt>Room level</dt>
            <dd>{report.mic.levelDbfs ?? '—'} dBFS</dd>
          </dl>
          <button className="big" onClick={share}>
            Share diagnostics
          </button>
          {shareMsg && <p role="status">{shareMsg}</p>}
          <pre className="json">{json}</pre>
        </section>
      )}

      <footer>
        build {BUILD.sha} · {BUILD.time.slice(0, 16).replace('T', ' ')} UTC
      </footer>
    </main>
  )
}

// Newer Chrome may report echo cancellation as a mode string ("all", "remote-only") instead of true/false.
function fmtFlag(v: boolean | string | undefined): string {
  if (v === undefined) return 'unknown'
  if (typeof v === 'string') return `${v} (check)`
  return v ? 'ON (bad)' : 'OFF (good)'
}
