import { useState } from 'react'
import { engine, monitor } from '../audio/session'
import { buildDiagnostics } from '../diagnostics/report'
import { shareText, type ShareResult } from '../diagnostics/share'

const MESSAGES: Record<ShareResult, string> = {
  shared: 'Sent.',
  copied: 'Copied. Paste it into the chat on the laptop.',
  cancelled: 'Cancelled.',
  failed: 'Could not share or copy. Take a screenshot instead.',
}

export function ShareButton() {
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <>
      <button className="big secondary" onClick={async () => setMsg(MESSAGES[await shareText('Hum diagnostics', buildDiagnostics(engine, monitor))])}>
        Share diagnostics
      </button>
      {msg && <p role="status">{msg}</p>}
    </>
  )
}
