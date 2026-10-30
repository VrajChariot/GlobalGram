import { describe, expect, it } from 'vitest'
import { EVENT_CATEGORIES } from '../../core/events/GlobeEvent'
import { HUBS } from './mockEventData'
import { generateMockEvents, greatCircleDeg, MIN_SEPARATION_DEG } from './MockEventSource'

const NOW = Date.parse('2026-10-24T12:00:00Z')
const events = generateMockEvents({ now: NOW })

describe('generateMockEvents', () => {
  it('produces 2,000 well-formed events with unique ids', () => {
    expect(events).toHaveLength(2000)
    expect(new Set(events.map((e) => e.id)).size).toBe(2000)
    for (const e of events) {
      expect(EVENT_CATEGORIES).toContain(e.category)
      expect(e.importance).toBeGreaterThanOrEqual(0)
      expect(e.importance).toBeLessThanOrEqual(1)
      expect(Math.abs(e.lat)).toBeLessThanOrEqual(90)
      expect(Math.abs(e.lng)).toBeLessThanOrEqual(180)
      expect(e.title).not.toMatch(/[{}]/)
      expect(e.summary).not.toMatch(/[{}]/)
      const age = NOW - Date.parse(e.timestamp)
      expect(age).toBeGreaterThanOrEqual(0)
      expect(age).toBeLessThanOrEqual(72 * 3600 * 1000)
    }
  })

  it('is deterministic for a seed', () => {
    expect(generateMockEvents({ now: NOW })).toEqual(events)
    expect(generateMockEvents({ now: NOW, seed: 1 })[0]).not.toEqual(events[0])
  })

  it('keeps events at least the minimum separation apart', () => {
    let closest = Infinity
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        closest = Math.min(closest, greatCircleDeg(events[i].lat, events[i].lng, events[j].lat, events[j].lng))
      }
    }
    expect(closest).toBeGreaterThanOrEqual(MIN_SEPARATION_DEG)
  })

  it('weights events towards populated hubs', () => {
    const nearHub = events.filter((e) => HUBS.some((h) => greatCircleDeg(e.lat, e.lng, h.lat, h.lng) < 12))
    expect(nearHub.length / events.length).toBeGreaterThan(0.85)
  })

  it('mixes all categories', () => {
    const counts = new Map(EVENT_CATEGORIES.map((c) => [c, events.filter((e) => e.category === c).length]))
    for (const n of counts.values()) expect(n).toBeGreaterThan(150)
  })
})
