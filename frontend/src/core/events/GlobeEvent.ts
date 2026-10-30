export const EVENT_CATEGORIES = ['conflict', 'politics', 'disaster', 'economy', 'science', 'other'] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export type GlobeEvent = {
  id: string
  lat: number
  lng: number
  /** Human-readable location, e.g. "Tokyo, Japan". */
  place?: string
  category: EventCategory
  /** 0..1 */
  importance: number
  title: string
  summary?: string
  imageUrl?: string
  sourceUrl?: string
  /** ISO 8601 */
  timestamp: string
}

/** Stable index for shader uniforms and per-category arrays. */
export function categoryIndex(category: EventCategory): number {
  return EVENT_CATEGORIES.indexOf(category)
}
