import { parseLocalDate, today } from './dates'

export interface Clock {
  today(): string
  nowIso(): string
}

export function systemClock(): Clock {
  return {
    today: () => today(),
    nowIso: () => new Date().toISOString(),
  }
}

export function fixedClock(date: string): Clock {
  const parsed = parseLocalDate(date)
  parsed.setHours(12, 0, 0, 0)
  const iso = parsed.toISOString()
  return {
    today: () => date,
    nowIso: () => iso,
  }
}
