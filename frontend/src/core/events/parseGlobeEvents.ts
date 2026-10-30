import { EVENT_CATEGORIES, type EventCategory, type GlobeEvent } from './GlobeEvent'

/**
 * Parse and validate raw API response into strongly typed GlobeEvent[].
 * Drops invalid items silently; throws only on non-array input.
 */
export function parseGlobeEvents(data: unknown): GlobeEvent[] {
  if (!Array.isArray(data)) {
    throw new Error('Event API returned a non-array')
  }

  const result: GlobeEvent[] = []

  for (const item of data) {
    if (typeof item !== 'object' || item === null) {
      continue
    }

    const obj = item as Record<string, unknown>

    // Validate required string fields
    const id = obj.id
    const title = obj.title
    const timestamp = obj.timestamp

    if (typeof id !== 'string' || id === '' || typeof title !== 'string' || title === '' || typeof timestamp !== 'string' || timestamp === '') {
      continue
    }

    // Validate timestamp is a valid ISO 8601 date
    if (!Number.isFinite(Date.parse(timestamp))) {
      continue
    }

    // Validate lat/lng
    const lat = obj.lat
    const lng = obj.lng

    if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
      continue
    }

    if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      continue
    }

    // Validate importance
    const importance = obj.importance
    if (typeof importance !== 'number' || !Number.isFinite(importance) || importance < 0 || importance > 1) {
      continue
    }

    // Validate category
    const category = obj.category
    if (!(EVENT_CATEGORIES as readonly unknown[]).includes(category)) {
      continue
    }

    // Validate optional string fields
    const place = obj.place
    const summary = obj.summary
    const imageUrl = obj.imageUrl
    const sourceUrl = obj.sourceUrl

    if (place !== undefined && typeof place !== 'string') {
      continue
    }

    if (summary !== undefined && typeof summary !== 'string') {
      continue
    }

    if (imageUrl !== undefined && typeof imageUrl !== 'string') {
      continue
    }

    if (sourceUrl !== undefined && typeof sourceUrl !== 'string') {
      continue
    }

    // Build event with only known fields
    const event: GlobeEvent = {
      id,
      lat,
      lng,
      category: category as EventCategory,
      importance,
      title,
      timestamp,
    }

    if (place !== undefined) event.place = place
    if (summary !== undefined) event.summary = summary
    if (imageUrl !== undefined) event.imageUrl = imageUrl
    if (sourceUrl !== undefined) event.sourceUrl = sourceUrl

    result.push(event)
  }

  return result
}
