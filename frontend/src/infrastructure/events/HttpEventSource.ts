import { parseGlobeEvents } from '../../core/events/parseGlobeEvents'
import type { EventSource } from './EventSource'

export class HttpEventSource implements EventSource {
  private baseUrl: string

  constructor(baseUrl: string = import.meta.env.VITE_API_BASE_URL ?? '') {
    this.baseUrl = baseUrl
  }

  async fetchEvents() {
    const res = await fetch(`${this.baseUrl}/api/events?limit=2000`)
    if (!res.ok) {
      throw new Error(`Event API ${res.status}`)
    }
    return parseGlobeEvents(await res.json())
  }
}
