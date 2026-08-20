import { describe, expect, it } from 'vitest'
import {
  addDays,
  eachDate,
  endOfMonth,
  endOfWeekSunday,
  formatChineseDate,
  formatLocalDate,
  isoWeekday,
  monthRange,
  monthsFromTo,
  parseLocalDate,
  previousYearMonth,
  startOfMonth,
  startOfWeekMonday,
  today,
  yearMonth,
} from './dates'

describe('local business dates', () => {
  it('formats a local Date as YYYY-MM-DD without using UTC ISO', () => {
    const date = new Date(2026, 7, 21, 0, 30, 0)
    expect(formatLocalDate(date)).toBe('2026-08-21')
  })

  it('does not shift a late-evening local date to the next UTC day', () => {
    const date = new Date(2026, 7, 21, 23, 30, 0)
    expect(formatLocalDate(date)).toBe('2026-08-21')
  })

  it('parses YYYY-MM-DD as a local calendar date', () => {
    const parsed = parseLocalDate('2026-08-21')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(7)
    expect(parsed.getDate()).toBe(21)
  })

  it('uses an injected clock for today()', () => {
    expect(today(new Date(2026, 7, 20, 22, 0, 0))).toBe('2026-08-20')
  })

  it('adds calendar days', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-08-21', -1)).toBe('2026-08-20')
  })

  it('uses ISO weekdays with Monday = 1 and Sunday = 7', () => {
    expect(isoWeekday('2026-08-21')).toBe(5)
    expect(isoWeekday('2026-08-23')).toBe(7)
    expect(isoWeekday('2026-08-24')).toBe(1)
  })

  it('computes Monday-Sunday week bounds', () => {
    expect(startOfWeekMonday('2026-08-21')).toBe('2026-08-17')
    expect(endOfWeekSunday('2026-08-21')).toBe('2026-08-23')
    expect(startOfWeekMonday('2026-08-17')).toBe('2026-08-17')
    expect(endOfWeekSunday('2026-08-23')).toBe('2026-08-23')
  })

  it('computes natural month bounds', () => {
    expect(startOfMonth('2026-08-21')).toBe('2026-08-01')
    expect(endOfMonth('2026-08-21')).toBe('2026-08-31')
    expect(endOfMonth('2026-02-01')).toBe('2026-02-28')
    expect(yearMonth('2026-08-21')).toBe('2026-08')
    expect(monthRange('2026-08')).toEqual({ start: '2026-08-01', end: '2026-08-31' })
  })

  it('lists inclusive dates and previous months', () => {
    expect(eachDate('2026-08-30', '2026-09-01')).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
    ])
    expect(previousYearMonth('2026-01')).toBe('2025-12')
    expect(monthsFromTo('2026-07', '2026-09')).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
    ])
  })

  it('formats Chinese display dates', () => {
    expect(formatChineseDate('2026-08-21')).toBe('8 月 21 日 星期五')
    expect(formatChineseDate('2026-08-23')).toBe('8 月 23 日 星期日')
  })
})
