import type { GlobeEvent } from '../../core/events/GlobeEvent'

/** Where events come from. Features depend on this, never on a concrete source. */
export interface EventSource {
  fetchEvents(): Promise<GlobeEvent[]>
}
