import type { GlobeEvent } from '../events/GlobeEvent'

/** Member ids of a cluster that zooming can't split, most important first (ties keep their original order). */
export function stackIds(members: number[], events: GlobeEvent[]): string[] {
  return members
    .map((m, order) => ({ event: events[m], order }))
    .sort((a, b) => b.event.importance - a.event.importance || a.order - b.order)
    .map(({ event }) => event.id)
}

/**
 * The id to show when the stack is selected: the one after `currentId` if that
 * is in this stack (wrapping round), otherwise the first.
 */
export function nextInStack(ids: string[], currentId: string | null): string {
  const at = currentId === null ? -1 : ids.indexOf(currentId)
  return ids[(at + 1) % ids.length]
}
