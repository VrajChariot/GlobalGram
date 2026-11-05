import type { GlobeEvent } from './GlobeEvent'
import { useEventStore } from '../../store/eventStore'

export type EventSummary = {
  total: number
  byCategory: Record<string, number>
  topPlace: string | null
}

/** Summarises the loaded events (defaults to whatever the event store currently holds). */
export function summarizeEvents(events: GlobeEvent[] = useEventStore.getState().events): EventSummary {
  const byCategory: Record<string, number> = {}
  const placeCounts = new Map<string, number>()
  for (const event of events) {
    byCategory[event.category] = (byCategory[event.category] ?? 0) + 1
    if (event.place) placeCounts.set(event.place, (placeCounts.get(event.place) ?? 0) + 1)
  }
  let topPlace: string | null = null
  let best = 0
  for (const [place, count] of placeCounts) {
    if (count > best) {
      best = count
      topPlace = place
    }
  }
  return { total: events.length, byCategory, topPlace }
}
