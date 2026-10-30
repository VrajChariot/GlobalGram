const UNITS: [limitSeconds: number, divisor: number, unit: string][] = [
  [60, 1, 's'],
  [3600, 60, 'min'],
  [86_400, 3600, 'h'],
  [604_800, 86_400, 'd'],
]

/** "just now", "12 min ago", "3 h ago", "2 d ago"; older dates fall back to a short date. */
export function relativeTime(isoTimestamp: string, now: number): string {
  const seconds = Math.round((now - Date.parse(isoTimestamp)) / 1000)
  if (Number.isNaN(seconds)) return ''
  if (seconds < 45) return 'just now'
  for (const [limit, divisor, unit] of UNITS) {
    if (seconds < limit) return `${Math.floor(seconds / divisor)} ${unit} ago`
  }
  return new Date(isoTimestamp).toISOString().slice(0, 10)
}
