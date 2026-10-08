export function formatDelta(n: number): string {
  if (n > 0) return `+${n}`
  return String(n)
}

export function formatBalance(n: number): string {
  return n.toLocaleString('en-US')
}
