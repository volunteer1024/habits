const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六']

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function today(now: Date = new Date()): string {
  return formatLocalDate(now)
}

export function addDays(date: string, days: number): string {
  const next = parseLocalDate(date)
  next.setDate(next.getDate() + days)
  return formatLocalDate(next)
}

export function compareDates(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

export function isoWeekday(date: string): number {
  const day = parseLocalDate(date).getDay()
  return day === 0 ? 7 : day
}

export function startOfWeekMonday(date: string): string {
  return addDays(date, -(isoWeekday(date) - 1))
}

export function endOfWeekSunday(date: string): string {
  return addDays(startOfWeekMonday(date), 6)
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`
}

export function endOfMonth(date: string): string {
  const start = parseLocalDate(startOfMonth(date))
  const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  return formatLocalDate(nextMonth)
}

export function yearMonth(date: string): string {
  return date.slice(0, 7)
}

export function monthRange(ym: string): { start: string; end: string } {
  const start = `${ym}-01`
  return { start, end: endOfMonth(start) }
}

export function eachDate(start: string, end: string): string[] {
  const dates: string[] = []
  let cursor = start
  while (cursor <= end) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

export function previousYearMonth(ym: string): string {
  const start = parseLocalDate(`${ym}-01`)
  const prev = new Date(start.getFullYear(), start.getMonth() - 1, 1)
  return yearMonth(formatLocalDate(prev))
}

export function monthsFromTo(fromYm: string, toYmInclusive: string): string[] {
  const months: string[] = []
  let cursor = fromYm
  while (cursor <= toYmInclusive) {
    months.push(cursor)
    const start = parseLocalDate(`${cursor}-01`)
    const next = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    cursor = yearMonth(formatLocalDate(next))
  }
  return months
}

export function formatChineseDate(date: string): string {
  const parsed = parseLocalDate(date)
  return `${parsed.getMonth() + 1} 月 ${parsed.getDate()} 日 星期${WEEKDAY_CN[parsed.getDay()]}`
}

export function formatChineseMonth(ym: string): string {
  const month = Number(ym.slice(5, 7))
  return `${month} 月`
}

export function formatLedgerDay(date: string, todayDate: string): string {
  if (date === todayDate) return '今天'
  if (date === addDays(todayDate, -1)) return '昨天'
  const parsed = parseLocalDate(date)
  return `${parsed.getMonth() + 1} 月 ${parsed.getDate()} 日`
}

export function weekdayLabel(isoDay: number): string {
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  return labels[isoDay - 1] ?? ''
}

export function calendarGrid(ym: string): { date: string; inMonth: boolean }[] {
  const { start, end } = monthRange(ym)
  const gridStart = startOfWeekMonday(start)
  const gridEnd = endOfWeekSunday(end)
  return eachDate(gridStart, gridEnd).map((date) => ({
    date,
    inMonth: date >= start && date <= end,
  }))
}
