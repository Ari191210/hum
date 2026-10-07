import { useEffect, useReducer, useState } from 'react'
import { engine, monitor } from '../audio/session'
import { READOUT_INTERVAL_MS } from '../config'
import type { SonarFeatures } from '../dsp/spectrum'

/** Re-renders when the engine's state, carrier or gain changes. */
export function useEngine() {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => engine.onChange(bump), [])
  return engine
}

/** Latest features, refreshed a few times per second so numbers are readable. */
export function useReadout(): SonarFeatures | null {
  const [features, setFeatures] = useState<SonarFeatures | null>(null)
  useEffect(() => {
    let last = 0
    return monitor.subscribe((f) => {
      if (f.t - last < READOUT_INTERVAL_MS) return
      last = f.t
      setFeatures(f.features)
    })
  }, [])
  return features
}
