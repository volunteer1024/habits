import { describe, expect, it } from 'vitest'
import { createId, isScheduledOn, scheduledDates } from './schedule'
import type { Task } from './types'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function withCrypto<T>(value: object, run: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value,
  })
  try {
    return run()
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor)
  }
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: '背单词',
    points: 5,
    monthlyPerfectBonus: 0,
    recordOffsetDays: 0,
    status: 'active',
    createdAt: '2026-08-21T00:00:00.000Z',
    updatedAt: '2026-08-21T00:00:00.000Z',
    schedule: {
      frequency: 'daily',
      interval: 1,
      startDate: '2026-08-21',
      endType: 'never',
    },
    ...overrides,
  }
}

describe('schedule', () => {
  it('schedules daily tasks from startDate', () => {
    const task = makeTask()
    expect(isScheduledOn(task, '2026-08-20')).toBe(false)
    expect(isScheduledOn(task, '2026-08-21')).toBe(true)
    expect(isScheduledOn(task, '2026-08-22')).toBe(true)
  })

  it('honors daily interval', () => {
    const task = makeTask({
      schedule: {
        frequency: 'daily',
        interval: 2,
        startDate: '2026-08-21',
        endType: 'never',
      },
    })
    expect(isScheduledOn(task, '2026-08-21')).toBe(true)
    expect(isScheduledOn(task, '2026-08-22')).toBe(false)
    expect(isScheduledOn(task, '2026-08-23')).toBe(true)
  })

  it('schedules weekly weekdays on or after startDate', () => {
    const task = makeTask({
      name: '健身',
      schedule: {
        frequency: 'weekly',
        interval: 1,
        startDate: '2026-08-21',
        weekdays: [1, 3, 5],
        endType: 'never',
      },
    })
    expect(isScheduledOn(task, '2026-08-21')).toBe(true)
    expect(isScheduledOn(task, '2026-08-22')).toBe(false)
    expect(isScheduledOn(task, '2026-08-24')).toBe(true)
    expect(isScheduledOn(task, '2026-08-19')).toBe(false)
  })

  it('honors weekly interval from the start week', () => {
    const task = makeTask({
      schedule: {
        frequency: 'weekly',
        interval: 2,
        startDate: '2026-08-21',
        weekdays: [5],
        endType: 'never',
      },
    })
    expect(isScheduledOn(task, '2026-08-21')).toBe(true)
    expect(isScheduledOn(task, '2026-08-28')).toBe(false)
    expect(isScheduledOn(task, '2026-09-04')).toBe(true)
  })

  it('stops after COUNT scheduled occurrences', () => {
    const task = makeTask({
      schedule: {
        frequency: 'daily',
        interval: 1,
        startDate: '2026-08-21',
        endType: 'count',
        count: 3,
      },
    })
    expect(scheduledDates(task, '2026-08-21', '2026-08-30')).toEqual([
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ])
    expect(isScheduledOn(task, '2026-08-24')).toBe(false)
  })

  it('does not schedule archived tasks after the archive date', () => {
    const task = makeTask({
      status: 'archived',
      archivedOn: '2026-08-25',
      updatedAt: '2026-08-25T03:00:00.000Z',
    })
    expect(isScheduledOn(task, '2026-08-24')).toBe(true)
    expect(isScheduledOn(task, '2026-08-25')).toBe(false)
  })
})

describe('createId', () => {
  it('returns a uuid v4', () => {
    expect(createId()).toMatch(UUID_V4)
  })

  it('still returns a uuid v4 when randomUUID is unavailable', () => {
    const webCrypto = globalThis.crypto
    withCrypto({ getRandomValues: webCrypto.getRandomValues.bind(webCrypto) }, () => {
      expect(createId()).toMatch(UUID_V4)
      expect(createId()).not.toBe(createId())
    })
  })
})
