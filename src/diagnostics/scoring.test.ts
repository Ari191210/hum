import { describe, expect, it } from 'vitest'
import type { SonarFeatures } from '../dsp/spectrum'
import { bestSweepPoint, checkPilot, checkVoiceProcessing, scoreHandTest } from './scoring'

function f(motionDb: number, velocity = 0, snrDb = 40): SonarFeatures {
  return { pilotHz: 19_500, pilotDb: -30, noiseDb: -70, snrDb, aboveDb: motionDb, belowDb: motionDb, motionDb, velocity }
}

describe('scoreHandTest', () => {
  it('passes when movement clearly stands out from stillness', () => {
    const idle = Array.from({ length: 100 }, (_, i) => f(-60 + (i % 3)))
    const move = Array.from({ length: 100 }, (_, i) => f(i % 2 ? -35 : -58, i % 4 < 2 ? 0.8 : -0.8))
    const r = scoreHandTest('A', 19_500, idle, move)
    expect(r.contrastDb).toBeGreaterThan(20)
    expect(r.status).toBe('PASS')
    expect(r.towardShare).toBeGreaterThan(0.3)
    expect(r.awayShare).toBeGreaterThan(0.3)
  })

  it('fails when moving looks the same as still', () => {
    const idle = Array.from({ length: 100 }, (_, i) => f(-60 + (i % 5)))
    const r = scoreHandTest('B', 19_500, idle, idle)
    expect(r.status).toBe('FAIL')
  })

  it('fails safely with no data', () => {
    expect(scoreHandTest('C', 19_500, [], []).status).toBe('FAIL')
  })
})

describe('checks', () => {
  it('picks the carrier with the best signal', () => {
    const best = bestSweepPoint([
      { carrierHz: 18_000, snrDb: 30, pilotDb: -40 },
      { carrierHz: 20_000, snrDb: 45, pilotDb: -35 },
    ])
    expect(best?.carrierHz).toBe(20_000)
    expect(checkPilot(best).status).toBe('PASS')
    expect(checkPilot(null).status).toBe('FAIL')
  })

  it('flags call processing that is on, including mode strings', () => {
    expect(checkVoiceProcessing({ echoCancellation: false, noiseSuppression: false, autoGainControl: false }).status).toBe('PASS')
    expect(checkVoiceProcessing({ echoCancellation: true, noiseSuppression: false, autoGainControl: false }).status).toBe('FAIL')
    expect(checkVoiceProcessing({ echoCancellation: 'all' as unknown as boolean, noiseSuppression: false, autoGainControl: false }).status).toBe('FAIL')
    expect(checkVoiceProcessing({}).status).toBe('WARN')
  })
})
