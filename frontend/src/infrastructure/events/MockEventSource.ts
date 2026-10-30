import { EVENT_CATEGORIES, type EventCategory, type GlobeEvent } from '../../core/events/GlobeEvent'
import { gaussian, mulberry32, pick, pickWeighted } from '../../core/math/random'
import type { EventSource } from './EventSource'
import { CATEGORY_WEIGHTS, HUBS, SUMMARIES, TITLES, type Hub } from './mockEventData'

export type MockEventOptions = {
  count?: number
  seed?: number
  /** Simulated network latency. */
  latencyMs?: number
  now?: number
}

/** Events never sit closer than this, so every cluster can split at full zoom. */
export const MIN_SEPARATION_DEG = 1.2
const SCATTER_DEG = 3
const MAX_LAT = 72
const WINDOW_MS = 72 * 3600 * 1000
const ATTEMPTS_PER_HUB = 24

export class MockEventSource implements EventSource {
  private readonly options: MockEventOptions

  constructor(options: MockEventOptions = {}) {
    this.options = options
  }

  async fetchEvents(): Promise<GlobeEvent[]> {
    const events = generateMockEvents(this.options)
    await new Promise((resolve) => setTimeout(resolve, this.options.latencyMs ?? 250))
    return events
  }
}

/** Deterministic for a given seed and `now`. */
export function generateMockEvents({ count = 2000, seed = 20261024, now = Date.now() }: MockEventOptions = {}): GlobeEvent[] {
  const random = mulberry32(seed)
  const spacing = new SpacingGrid(MIN_SEPARATION_DEG)
  const events: GlobeEvent[] = []

  while (events.length < count) {
    const hub = pickWeighted(random, HUBS, (h) => Math.pow(h.population, 0.75))
    const spot = scatterAround(hub, random, spacing)
    if (!spot) continue
    spacing.add(spot.lat, spot.lng)

    const category = pickWeighted(random, EVENT_CATEGORIES, (c) => CATEGORY_WEIGHTS[c])
    const id = `evt-${String(events.length + 1).padStart(4, '0')}`
    events.push({
      id,
      lat: round(spot.lat, 4),
      lng: round(spot.lng, 4),
      place: `${hub.city}, ${hub.country}`,
      category,
      importance: round(importanceFor(category, random), 3),
      title: fill(pick(random, TITLES[category]), hub, random),
      summary: fill(pick(random, SUMMARIES[category]), hub, random),
      sourceUrl: `https://example.com/globalgram/${id}`,
      timestamp: new Date(now - Math.pow(random(), 1.5) * WINDOW_MS).toISOString(),
    })
  }
  return events
}

function scatterAround(hub: Hub, random: () => number, spacing: SpacingGrid): { lat: number; lng: number } | null {
  for (let attempt = 0; attempt < ATTEMPTS_PER_HUB; attempt++) {
    // Widen the scatter on retries so crowded hubs spill outward instead of stalling.
    const sigma = SCATTER_DEG * (1 + attempt / 8)
    const lat = clamp(hub.lat + gaussian(random) * sigma, -MAX_LAT, MAX_LAT)
    const lng = wrapLng(hub.lng + (gaussian(random) * sigma) / Math.max(0.25, Math.cos((lat * Math.PI) / 180)))
    if (spacing.isFree(lat, lng)) return { lat, lng }
  }
  return null
}

/** Most events are minor (median ≈ 0.1); conflicts and disasters skew a little more important. */
function importanceFor(category: EventCategory, random: () => number): number {
  const boost = category === 'conflict' || category === 'disaster' ? 0.12 : 0
  return clamp(Math.pow(random(), 3.2) + boost * random(), 0, 1)
}

function fill(template: string, hub: Hub, random: () => number): string {
  return template
    .replaceAll('{city}', hub.city)
    .replaceAll('{country}', hub.country)
    .replaceAll('{n}', String(2 + Math.floor(random() * 48)))
    .replaceAll('{mag}', (4.5 + random() * 2.9).toFixed(1))
    .replaceAll('{temp}', String(40 + Math.floor(random() * 9)))
    .replaceAll('{rate}', (1.5 + random() * 8).toFixed(1))
    .replaceAll('{pct}', (0.5 + random() * 3).toFixed(1))
}

/** Rejects points within `minDeg` (great-circle) of any accepted point. */
class SpacingGrid {
  private readonly cells = new Map<string, { lat: number; lng: number }[]>()
  private readonly minDeg: number

  constructor(minDeg: number) {
    this.minDeg = minDeg
  }

  isFree(lat: number, lng: number): boolean {
    const row = Math.floor(lat / this.minDeg)
    // Longitude cells shrink towards the poles, so search wider there.
    const span = Math.ceil(1 / Math.max(0.2, Math.cos(((Math.abs(lat) + this.minDeg) * Math.PI) / 180)))
    const col = Math.floor(lng / this.minDeg)
    const cols = Math.ceil(360 / this.minDeg)
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - span; c <= col + span; c++) {
        for (const p of this.cells.get(`${r}:${((c % cols) + cols) % cols}`) ?? []) {
          if (greatCircleDeg(lat, lng, p.lat, p.lng) < this.minDeg) return false
        }
      }
    }
    return true
  }

  add(lat: number, lng: number): void {
    const cols = Math.ceil(360 / this.minDeg)
    const col = ((Math.floor(lng / this.minDeg) % cols) + cols) % cols
    const key = `${Math.floor(lat / this.minDeg)}:${col}`
    const cell = this.cells.get(key)
    if (cell) cell.push({ lat, lng })
    else this.cells.set(key, [{ lat, lng }])
  }
}

export function greatCircleDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(a)))) / r
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const wrapLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180
const round = (v: number, digits: number) => Number(v.toFixed(digits))
