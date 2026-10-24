import { useEffect } from 'react'
import type { EventSource } from '../../infrastructure/events/EventSource'
import { useEventStore } from '../../store/eventStore'

/** Loads events from any EventSource into the event store. */
export function useEventFeed(source: EventSource): void {
  useEffect(() => {
    let cancelled = false
    const store = useEventStore.getState()
    store.setStatus('loading')
    source
      .fetchEvents()
      .then((events) => {
        if (cancelled) return
        store.setEvents(events)
        store.setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) store.setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [source])
}
