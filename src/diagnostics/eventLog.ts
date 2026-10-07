import { EVENT_LOG_MAX } from '../config'

export interface LogEntry {
  /** Seconds since the page loaded. */
  t: number
  msg: string
}

const entries: LogEntry[] = []

/** Short plain-English notes about what happened, included in Share diagnostics. */
export function logEvent(msg: string): void {
  entries.push({ t: Math.round(performance.now() / 100) / 10, msg })
  if (entries.length > EVENT_LOG_MAX) entries.shift()
}

export const getEventLog = (): readonly LogEntry[] => entries
