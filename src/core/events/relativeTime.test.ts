import { describe, expect, it } from 'vitest'
import { relativeTime } from './relativeTime'

const NOW = Date.parse('2026-10-25T12:00:00Z')
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

describe('relativeTime', () => {
  it('reads naturally across ranges', () => {
    expect(relativeTime(ago(10), NOW)).toBe('just now')
    expect(relativeTime(ago(50), NOW)).toBe('50 s ago')
    expect(relativeTime(ago(12 * 60), NOW)).toBe('12 min ago')
    expect(relativeTime(ago(3 * 3600 + 120), NOW)).toBe('3 h ago')
    expect(relativeTime(ago(2 * 86_400), NOW)).toBe('2 d ago')
  })

  it('falls back to the date after a week', () => {
    expect(relativeTime('2026-10-01T08:00:00Z', NOW)).toBe('2026-10-01')
  })

  it('returns empty for an invalid timestamp', () => {
    expect(relativeTime('nope', NOW)).toBe('')
  })
})
