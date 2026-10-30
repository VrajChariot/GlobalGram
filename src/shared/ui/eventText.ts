import type { EventCategory, GlobeEvent } from '../../core/events/GlobeEvent'

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  conflict: 'Conflict',
  politics: 'Politics',
  disaster: 'Disaster',
  economy: 'Economy',
  science: 'Science',
  other: 'Other',
}

export function importanceLabel(importance: number): string {
  if (importance >= 0.66) return 'Major story'
  if (importance >= 0.33) return 'Notable story'
  return 'Minor story'
}

export function formatLatLng(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`
}

/** The event's place name, or its coordinates when it has none. */
export function placeLabel(event: Pick<GlobeEvent, 'place' | 'lat' | 'lng'>): string {
  return event.place ?? formatLatLng(event.lat, event.lng)
}
