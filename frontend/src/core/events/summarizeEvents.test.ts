import { describe, it, expect } from 'vitest'
import type { GlobeEvent } from './GlobeEvent'
import { summarizeEvents } from './summarizeEvents'

function fakeEvents(n: number): GlobeEvent[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    lat: Math.random() * 180 - 90,
    lng: Math.random() * 360 - 180,
    place: i % 2 === 0 ? 'Tokyo, Japan' : 'Paris, France',
    category: i % 3 === 0 ? 'conflict' : 'politics',
    importance: 0.5,
    title: `Event ${i}`,
    timestamp: '2026-10-30T12:00:00Z',
  }))
}

describe('summarizeEvents', () => {
  it('counts events per category and finds the busiest place', () => {
    const summary = summarizeEvents(fakeEvents(6))
    expect(summary.total).toBe(6)
    expect(summary.byCategory).toEqual({ conflict: 2, politics: 4 })
    expect(summary.topPlace).toBe('Tokyo, Japan')
  })
})
