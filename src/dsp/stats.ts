/** Value below which `p` (0–1) of the data falls, with linear interpolation. Returns NaN for no data. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const pos = Math.min(Math.max(p, 0), 1) * (sorted.length - 1)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  const a = sorted[lo] ?? NaN
  const b = sorted[hi] ?? NaN
  return a + (b - a) * (pos - lo)
}

export const median = (values: readonly number[]): number => percentile(values, 0.5)

export function round(n: number, digits = 1): number {
  if (!Number.isFinite(n)) return n
  const f = 10 ** digits
  return Math.round(n * f) / f
}
