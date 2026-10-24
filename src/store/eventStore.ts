import { create } from 'zustand'
import type { Cluster } from '../core/clustering/screenClusters'
import type { GlobeEvent } from '../core/events/GlobeEvent'
import type { ScreenSegments } from '../core/picking/magneticSnap'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Projected beams, one per cluster instance. Arrays are reused; `version` bumps on rewrite. */
export type ScreenCache = ScreenSegments & {
  /** Cosine between each beam and the view direction (1 = pointing at the camera). */
  facing: Float32Array
  version: number
}

type EventState = {
  events: GlobeEvent[]
  status: LoadStatus
  /** Current clusters; instance i of the beams draws clusters[i]. */
  clusters: Cluster[]
  screen: ScreenCache
  setEvents: (events: GlobeEvent[]) => void
  setStatus: (status: LoadStatus) => void
  setClusters: (clusters: Cluster[]) => void
  setScreen: (screen: ScreenCache) => void
}

const EMPTY_SCREEN: ScreenCache = {
  base: new Float32Array(0),
  tip: new Float32Array(0),
  visible: new Uint8Array(0),
  facing: new Float32Array(0),
  count: 0,
  version: 0,
}

export const useEventStore = create<EventState>()((set) => ({
  events: [],
  status: 'idle',
  clusters: [],
  screen: EMPTY_SCREEN,
  setEvents: (events) => set({ events }),
  setStatus: (status) => set({ status }),
  setClusters: (clusters) => set({ clusters }),
  setScreen: (screen) => set({ screen }),
}))
