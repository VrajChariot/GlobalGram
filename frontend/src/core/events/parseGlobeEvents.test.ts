import { describe, it, expect } from 'vitest'
import { parseGlobeEvents } from './parseGlobeEvents'

const validEvent = {
  id: 'evt-1',
  lat: 35.68,
  lng: 139.69,
  place: 'Tokyo, Japan',
  category: 'politics',
  importance: 0.5,
  title: 'Political meeting',
  summary: 'A political discussion',
  imageUrl: 'https://example.com/image.jpg',
  sourceUrl: 'https://example.com/article',
  timestamp: '2026-10-30T12:00:00Z',
}

describe('parseGlobeEvents', () => {
  it('passes through a valid event', () => {
    const result = parseGlobeEvents([validEvent])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(validEvent)
  })

  it('throws on non-array input', () => {
    expect(() => parseGlobeEvents({ id: 'evt-1' })).toThrow('Event API returned a non-array')
    expect(() => parseGlobeEvents(null)).toThrow('Event API returned a non-array')
    expect(() => parseGlobeEvents('string')).toThrow('Event API returned a non-array')
    expect(() => parseGlobeEvents(123)).toThrow('Event API returned a non-array')
  })

  it('drops item with empty id', () => {
    const result = parseGlobeEvents([{ ...validEvent, id: '' }])
    expect(result).toHaveLength(0)
  })

  it('drops item with non-string id', () => {
    const result = parseGlobeEvents([{ ...validEvent, id: 123 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with empty title', () => {
    const result = parseGlobeEvents([{ ...validEvent, title: '' }])
    expect(result).toHaveLength(0)
  })

  it('drops item with non-string title', () => {
    const result = parseGlobeEvents([{ ...validEvent, title: 123 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with empty timestamp', () => {
    const result = parseGlobeEvents([{ ...validEvent, timestamp: '' }])
    expect(result).toHaveLength(0)
  })

  it('drops item with non-string timestamp', () => {
    const result = parseGlobeEvents([{ ...validEvent, timestamp: 123 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with invalid timestamp', () => {
    const result = parseGlobeEvents([{ ...validEvent, timestamp: 'not-a-date' }])
    expect(result).toHaveLength(0)
  })

  it('drops item with invalid lat (NaN)', () => {
    const result = parseGlobeEvents([{ ...validEvent, lat: NaN }])
    expect(result).toHaveLength(0)
  })

  it('drops item with lat out of range (>90)', () => {
    const result = parseGlobeEvents([{ ...validEvent, lat: 91 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with lat out of range (<-90)', () => {
    const result = parseGlobeEvents([{ ...validEvent, lat: -91 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with non-number lat', () => {
    const result = parseGlobeEvents([{ ...validEvent, lat: '35.68' }])
    expect(result).toHaveLength(0)
  })

  it('drops item with invalid lng (NaN)', () => {
    const result = parseGlobeEvents([{ ...validEvent, lng: NaN }])
    expect(result).toHaveLength(0)
  })

  it('drops item with lng out of range (>180)', () => {
    const result = parseGlobeEvents([{ ...validEvent, lng: 181 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with lng out of range (<-180)', () => {
    const result = parseGlobeEvents([{ ...validEvent, lng: -181 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with non-number lng', () => {
    const result = parseGlobeEvents([{ ...validEvent, lng: '139.69' }])
    expect(result).toHaveLength(0)
  })

  it('drops item with importance out of range (>1)', () => {
    const result = parseGlobeEvents([{ ...validEvent, importance: 1.1 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with importance out of range (<0)', () => {
    const result = parseGlobeEvents([{ ...validEvent, importance: -0.1 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with NaN importance', () => {
    const result = parseGlobeEvents([{ ...validEvent, importance: NaN }])
    expect(result).toHaveLength(0)
  })

  it('drops item with non-number importance', () => {
    const result = parseGlobeEvents([{ ...validEvent, importance: '0.5' }])
    expect(result).toHaveLength(0)
  })

  it('drops item with invalid category', () => {
    const result = parseGlobeEvents([{ ...validEvent, category: 'invalid' }])
    expect(result).toHaveLength(0)
  })

  it('drops item with non-string place', () => {
    const result = parseGlobeEvents([{ ...validEvent, place: 123 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with non-string summary', () => {
    const result = parseGlobeEvents([{ ...validEvent, summary: 123 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with non-string imageUrl', () => {
    const result = parseGlobeEvents([{ ...validEvent, imageUrl: 123 }])
    expect(result).toHaveLength(0)
  })

  it('drops item with non-string sourceUrl', () => {
    const result = parseGlobeEvents([{ ...validEvent, sourceUrl: 123 }])
    expect(result).toHaveLength(0)
  })

  it('omits extra unknown fields', () => {
    const result = parseGlobeEvents([
      {
        ...validEvent,
        extraField: 'should be dropped',
        anotherField: 123,
      },
    ])
    expect(result).toHaveLength(1)
    const event = result[0]
    expect('extraField' in event).toBe(false)
    expect('anotherField' in event).toBe(false)
  })

  it('omits optional fields when undefined', () => {
    const minimal = {
      id: 'evt-2',
      lat: 0,
      lng: 0,
      category: 'other',
      importance: 0,
      title: 'Title',
      timestamp: '2026-10-30T12:00:00Z',
    }
    const result = parseGlobeEvents([minimal])
    expect(result).toHaveLength(1)
    expect('place' in result[0]).toBe(false)
    expect('summary' in result[0]).toBe(false)
    expect('imageUrl' in result[0]).toBe(false)
    expect('sourceUrl' in result[0]).toBe(false)
  })

  it('includes optional fields when provided', () => {
    const result = parseGlobeEvents([validEvent])
    expect(result[0].place).toBe('Tokyo, Japan')
    expect(result[0].summary).toBe('A political discussion')
    expect(result[0].imageUrl).toBe('https://example.com/image.jpg')
    expect(result[0].sourceUrl).toBe('https://example.com/article')
  })

  it('processes multiple events, dropping invalid ones', () => {
    const result = parseGlobeEvents([
      validEvent,
      { ...validEvent, id: '' }, // dropped
      { ...validEvent, id: 'evt-3', lat: 91 }, // dropped
      { ...validEvent, id: 'evt-4' }, // kept
    ])
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('evt-1')
    expect(result[1].id).toBe('evt-4')
  })
})
