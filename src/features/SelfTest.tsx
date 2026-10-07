import { useState } from 'react'
import { engine, monitor } from '../audio/session'
import { sessionResults } from '../diagnostics/report'
import { runSelfTest, type Phase, type SelfTestResult } from '../diagnostics/tests'
import { PhaseCard } from '../ui/PhaseCard'
import { ShareButton } from '../ui/ShareButton'
import { PLACEMENTS } from './placements'

export function SelfTest({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase | null>(null)
  const [result, setResult] = useState<SelfTestResult | null>(null)

  async function run() {
    setResult(null)
    // Self-test always uses placement A (flat, hand above). The Lab's placement test compares the others.
    const r = await runSelfTest(engine, monitor, 'A', setPhase)
    sessionResults.selfTests.push(r)
    setResult(r)
    setPhase(null)
  }

  return (
    <main className="screen">
      <header className="bar">
        <h1>Self-test</h1>
        <button className="link" onClick={onBack} disabled={phase !== null}>
          ← Lab
        </button>
      </header>
      {!phase && (
        <>
          <p className="lead">
            About 20 seconds. Place the phone flat on a table, screen up, volume at max, no headphones. {PLACEMENTS[0].how}
          </p>
          <button className="big" onClick={() => void run()}>
            {result ? 'Run again' : 'Start self-test'}
          </button>
        </>
      )}
      {phase && <PhaseCard phase={phase} />}
      {result && (
        <section aria-live="polite">
          <ul className="checks">
            {result.checks.map((c) => (
              <li key={c.id} className={c.status.toLowerCase()}>
                <span className="status">{c.status}</span>
                <span>
                  <strong>{c.label}</strong>: {c.value}
                  {c.fix && <span className="fix">{c.fix}</span>}
                </span>
              </li>
            ))}
          </ul>
          {result.sweep.length > 0 && (
            <p className="small">
              Tone sweep (signal above noise):{' '}
              {result.sweep.map((p) => `${(p.carrierHz / 1000).toFixed(1)}k: ${p.snrDb} dB`).join(' · ')}
            </p>
          )}
          <ShareButton />
        </section>
      )}
    </main>
  )
}
