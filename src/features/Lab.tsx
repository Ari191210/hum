import { useState } from 'react'
import { engine, monitor } from '../audio/session'
import { DISPLAY_STILL_MOTION_DB, MAX_TONE_GAIN } from '../config'
import { sessionResults } from '../diagnostics/report'
import { handTest, type Phase } from '../diagnostics/tests'
import { round } from '../dsp/stats'
import { PhaseCard } from '../ui/PhaseCard'
import { ShareButton } from '../ui/ShareButton'
import { SpectrumView } from '../ui/SpectrumView'
import { useEngine, useReadout } from '../ui/useEngine'
import { PLACEMENTS, type PlacementId } from './placements'

function direction(v: number, motionDb: number): string {
  if (motionDb < DISPLAY_STILL_MOTION_DB) return '— still'
  if (v > 0.2) return '↑ toward'
  if (v < -0.2) return '↓ away'
  return '↕ mixed'
}

export function Lab({ onSelfTest }: { onSelfTest: () => void }) {
  const e = useEngine()
  const f = useReadout()
  const [placement, setPlacement] = useState<PlacementId>('A')
  const [phase, setPhase] = useState<Phase | null>(null)
  const [, setRuns] = useState(0)
  const running = e.state === 'running'

  async function runPlacement() {
    const { result } = await handTest(engine, monitor, placement, setPhase)
    sessionResults.handTests.push(result)
    setPhase(null)
    setRuns((n) => n + 1)
  }

  return (
    <main className="screen">
      <header className="bar">
        <h1>Hum Lab</h1>
        <span className={`pill ${e.state}`}>{e.state}</span>
      </header>

      {e.error && (
        <p className="warn" role="alert">
          {e.error}
        </p>
      )}

      {!running && (
        <>
          <p className="lead">
            Plays an inaudible tone and shows its echo live. Turn media volume to max and unplug headphones first.
          </p>
          <button className="big" onClick={() => void engine.start()} disabled={e.state === 'starting'}>
            {e.state === 'starting' ? 'Starting…' : e.state === 'paused' ? 'Resume sonar' : 'Start sonar'}
          </button>
        </>
      )}

      {running && <SpectrumView />}

      {running && f && (
        <dl className="readouts">
          <dt>Sample rate</dt>
          <dd>{e.sampleRate} Hz</dd>
          <dt>Tone</dt>
          <dd>{round(f.pilotHz, 0)} Hz</dd>
          <dt>Tone above noise</dt>
          <dd>{round(f.snrDb)} dB</dd>
          <dt>Echo spread</dt>
          <dd>{round(f.motionDb)} dB</dd>
          <dt>Above / below</dt>
          <dd>
            {round(f.aboveDb)} / {round(f.belowDb)} dB
          </dd>
          <dt>Direction</dt>
          <dd>{direction(f.velocity, f.motionDb)}</dd>
        </dl>
      )}

      {running && (
        <section className="controls">
          <label>
            Tone frequency: <strong>{e.carrierHz} Hz</strong>
            <input
              type="range"
              min={e.carrierRange.min}
              max={e.carrierRange.max}
              step={50}
              value={e.carrierHz}
              onChange={(ev) => engine.setCarrier(Number(ev.target.value))}
            />
          </label>
          <label>
            Tone level: <strong>{Math.round(e.toneGain * 100)}%</strong>
            <input
              type="range"
              min={0.05}
              max={MAX_TONE_GAIN}
              step={0.05}
              value={e.toneGain}
              onChange={(ev) => engine.setToneGain(Number(ev.target.value))}
            />
          </label>
        </section>
      )}

      {phase && <PhaseCard phase={phase} />}

      {running && !phase && (
        <section>
          <h2>Placement test</h2>
          <p className="lead">Pick how the phone is placed, then run the 12-second test. Repeat for each placement.</p>
          <div className="choices" role="radiogroup" aria-label="Placement">
            {PLACEMENTS.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={placement === p.id}
                className={`choice ${placement === p.id ? 'on' : ''}`}
                onClick={() => setPlacement(p.id)}
              >
                {placement === p.id ? '● ' : '○ '}
                {p.label}
              </button>
            ))}
          </div>
          <p>{PLACEMENTS.find((p) => p.id === placement)?.how}</p>
          <button className="big" onClick={() => void runPlacement()}>
            Run placement test
          </button>
          {sessionResults.handTests.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Place</th>
                    <th>Tone</th>
                    <th>Signal</th>
                    <th>Movement</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionResults.handTests.map((h, i) => (
                    <tr key={i}>
                      <td>{h.placement}</td>
                      <td>{h.carrierHz}</td>
                      <td>{h.snrDb} dB</td>
                      <td>+{h.contrastDb} dB</td>
                      <td>{h.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!phase && (
        <section>
          <button className="big secondary" onClick={onSelfTest}>
            Run self-test
          </button>
          <ShareButton />
          {running && (
            <button className="big secondary" onClick={() => void engine.stop()}>
              Stop sonar
            </button>
          )}
        </section>
      )}
    </main>
  )
}
