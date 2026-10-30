import { describe, expect, it } from 'vitest'
import type { GlobeEvent } from '../events/GlobeEvent'
import { nextInStack, stackIds } from './stack'

const event = (id: string, importance: number): GlobeEvent => ({
  id,
  lat: 0,
  lng: 0,
  category: 'other',
  importance,
  title: id,
  timestamp: '2026-01-01T00:00:00Z',
})

describe('stackIds', () => {
  it('orders by importance, keeping member order on ties', () => {
    const events = [event('a', 0.2), event('b', 0.9), event('c', 0.2), event('d', 0.5)]
    expect(stackIds([0, 1, 2, 3], events)).toEqual(['b', 'd', 'a', 'c'])
  })
})

describe('nextInStack', () => {
  const ids = ['x', 'y', 'z']
  it('starts at the first when nothing in the stack is selected', () => {
    expect(nextInStack(ids, null)).toBe('x')
    expect(nextInStack(ids, 'elsewhere')).toBe('x')
  })
  it('advances and wraps', () => {
    expect(nextInStack(ids, 'x')).toBe('y')
    expect(nextInStack(ids, 'z')).toBe('x')
  })
})
