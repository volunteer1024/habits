import { addDays, eachDate, isoWeekday, startOfWeekMonday } from './dates'
import type { Task } from './types'

function daysBetween(start: string, end: string): number {
  const from = Date.UTC(
    Number(start.slice(0, 4)),
    Number(start.slice(5, 7)) - 1,
    Number(start.slice(8, 10)),
  )
  const to = Date.UTC(
    Number(end.slice(0, 4)),
    Number(end.slice(5, 7)) - 1,
    Number(end.slice(8, 10)),
  )
  return Math.round((to - from) / 86_400_000)
}

function matchesFrequency(task: Task, date: string): boolean {
  const { schedule } = task
  if (date < schedule.startDate) return false
  if (schedule.interval < 1) return false

  if (schedule.frequency === 'daily') {
    return daysBetween(schedule.startDate, date) % schedule.interval === 0
  }

  const weekdays = schedule.weekdays ?? []
  if (!weekdays.includes(isoWeekday(date))) return false

  const startWeek = startOfWeekMonday(schedule.startDate)
  const dateWeek = startOfWeekMonday(date)
  const weeks = daysBetween(startWeek, dateWeek) / 7
  return weeks % schedule.interval === 0
}

function archiveCutoff(task: Task): string | undefined {
  if (task.status !== 'archived') return undefined
  return task.archivedOn
}

export function isScheduledOn(task: Task, date: string): boolean {
  const cutoff = archiveCutoff(task)
  if (cutoff && date >= cutoff) return false
  if (!matchesFrequency(task, date)) return false

  if (task.schedule.endType === 'count') {
    const limit = task.schedule.count ?? 0
    if (limit <= 0) return false
    let seen = 0
    for (const candidate of eachDate(task.schedule.startDate, date)) {
      if (!matchesFrequency(task, candidate)) continue
      seen += 1
      if (seen > limit) return false
    }
  }

  return true
}

export function scheduledDates(task: Task, start: string, end: string): string[] {
  const from = start < task.schedule.startDate ? task.schedule.startDate : start
  if (from > end) return []
  return eachDate(from, end).filter((date) => isScheduledOn(task, date))
}

export function lastScheduledDate(task: Task): string | null {
  if (task.schedule.endType !== 'count') return null
  const limit = task.schedule.count ?? 0
  if (limit <= 0) return null

  let seen = 0
  let cursor = task.schedule.startDate
  const hardStop = addDays(cursor, Math.max(limit * task.schedule.interval * 14, limit + 7))
  while (cursor <= hardStop) {
    if (matchesFrequency(task, cursor)) {
      seen += 1
      if (seen === limit) return cursor
    }
    cursor = addDays(cursor, 1)
  }
  return null
}

export function endedBefore(task: Task, date: string): boolean {
  const last = lastScheduledDate(task)
  if (last && last < date) return true
  const cutoff = archiveCutoff(task)
  if (cutoff && cutoff <= date) return true
  return false
}

export function createId(): string {
  return crypto.randomUUID()
}

export function nowIso(now: Date = new Date()): string {
  return now.toISOString()
}
