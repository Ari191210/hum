import { HAND_TEST_IDLE_MS, HAND_TEST_MOVE_MS, SWEEP_CARRIERS_HZ, SWEEP_MEASURE_MS, SWEEP_SETTLE_MS } from '../config'
import type { SonarEngine } from '../audio/sonarEngine'
import type { SonarMonitor } from '../audio/sonarMonitor'
import { logEvent } from './eventLog'
import {
  bestSweepPoint,
  checkHand,
  checkIdle,
  checkPilot,
  checkSampleRate,
  checkVoiceProcessing,
  scoreHandTest,
  summariseSweepStep,
  type CheckResult,
  type HandTestResult,
  type SweepPoint,
} from './scoring'

/** What the screen should show right now during a test. */
export interface Phase {
  title: string
  instruction: string
  /** Seconds left in this phase, if timed. */
  secondsLeft: number | null
}

export type PhaseCallback = (p: Phase) => void

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function countdown(ms: number, phase: Omit<Phase, 'secondsLeft'>, onPhase: PhaseCallback, work: Promise<unknown>) {
  const end = performance.now() + ms
  let done = false
  void work.then(() => (done = true))
  while (!done && performance.now() < end + 2_000) {
    onPhase({ ...phase, secondsLeft: Math.max(0, Math.ceil((end - performance.now()) / 1000)) })
    await wait(250)
  }
}

function cue(engine: SonarEngine, pattern: number | number[]) {
  engine.beep()
  navigator.vibrate?.(pattern)
}

/** Plays each candidate tone briefly and measures how clearly the mic hears it. */
export async function sweepCarriers(engine: SonarEngine, monitor: SonarMonitor, onPhase: PhaseCallback): Promise<SweepPoint[]> {
  const original = engine.carrierHz
  const { min, max } = engine.carrierRange
  const points: SweepPoint[] = []
  for (const hz of SWEEP_CARRIERS_HZ.filter((c) => c >= min && c <= max)) {
    onPhase({ title: 'Finding the best tone', instruction: `Testing ${(hz / 1000).toFixed(1)} kHz… keep still`, secondsLeft: null })
    engine.setCarrier(hz)
    await wait(SWEEP_SETTLE_MS)
    points.push(summariseSweepStep(hz, await monitor.collect(SWEEP_MEASURE_MS)))
  }
  const best = bestSweepPoint(points)
  engine.setCarrier(best?.carrierHz ?? original)
  logEvent(`sweep: ${points.map((p) => `${p.carrierHz}:${p.snrDb}`).join(' ')} → ${engine.carrierHz}`)
  return points
}

/** Measures stillness, then deliberate hand movement, at the current placement and tone. */
export async function handTest(
  engine: SonarEngine,
  monitor: SonarMonitor,
  placement: string,
  onPhase: PhaseCallback,
): Promise<{ result: HandTestResult; idle: CheckResult }> {
  cue(engine, 100)
  const idleWork = monitor.collect(HAND_TEST_IDLE_MS)
  await countdown(HAND_TEST_IDLE_MS, { title: 'Keep still', instruction: 'Hands away from the phone. Nobody move.' }, onPhase, idleWork)
  const idle = await idleWork

  cue(engine, [100, 80, 100])
  const moveWork = monitor.collect(HAND_TEST_MOVE_MS)
  await countdown(
    HAND_TEST_MOVE_MS,
    { title: 'Move your hand', instruction: 'Move one hand toward the phone and back, again and again, about 10–20 cm away.' },
    onPhase,
    moveWork,
  )
  const move = await moveWork
  cue(engine, 200)

  const result = scoreHandTest(placement, engine.carrierHz, idle, move)
  logEvent(`hand test ${placement}: contrast ${result.contrastDb} dB (${result.status}), snr ${result.snrDb}`)
  return { result, idle: checkIdle(idle) }
}

export interface SelfTestResult {
  startedAt: string
  checks: CheckResult[]
  sweep: SweepPoint[]
  hand: HandTestResult | null
}

/** The ~20-second one-tap check: mic, sample rate, call processing, tone, stillness, hand movement. */
export async function runSelfTest(engine: SonarEngine, monitor: SonarMonitor, placement: string, onPhase: PhaseCallback): Promise<SelfTestResult> {
  const startedAt = new Date().toISOString()
  onPhase({ title: 'Starting', instruction: 'Opening the microphone…', secondsLeft: null })
  await engine.start()
  if (engine.state !== 'running') {
    return {
      startedAt,
      sweep: [],
      hand: null,
      checks: [{ id: 'mic', label: 'Microphone', status: 'FAIL', value: 'could not start', fix: engine.error }],
    }
  }
  const checks: CheckResult[] = [
    { id: 'mic', label: 'Microphone', status: 'PASS', value: engine.micLabel || 'open', fix: null },
    checkSampleRate(engine.sampleRate),
    checkVoiceProcessing(engine.micSettings),
  ]
  const sweep = await sweepCarriers(engine, monitor, onPhase)
  const pilot = checkPilot(bestSweepPoint(sweep))
  checks.push(pilot)
  const { result, idle } = await handTest(engine, monitor, placement, onPhase)
  checks.push(idle, checkHand(result))
  checks.push({
    id: 'wake-lock',
    label: 'Screen stays on',
    status: engine.wakeLockActive ? 'PASS' : 'WARN',
    value: engine.wakeLockActive ? 'yes' : 'no',
    fix: engine.wakeLockActive ? null : 'Set the screen timeout to 10 minutes in Android settings while testing.',
  })
  return { startedAt, checks, sweep, hand: result }
}
