export function formatDelta(n: number): string {
  if (n > 0) return `+${n}`
  return String(n)
}

export function formatBalance(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatRate(completed: number, scheduled: number): string {
  if (scheduled === 0) return '0%'
  return `${Math.round((completed / scheduled) * 100)}%`
}
