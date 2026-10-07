import type { Phase } from '../diagnostics/tests'

/** Big instruction card shown while a test runs. */
export function PhaseCard({ phase }: { phase: Phase }) {
  return (
    <div className="phase" role="status" aria-live="assertive">
      <p className="phase-title">{phase.title}</p>
      <p>{phase.instruction}</p>
      {phase.secondsLeft !== null && <p className="phase-count">{phase.secondsLeft}</p>}
    </div>
  )
}
