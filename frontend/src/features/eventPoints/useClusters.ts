import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { angularRadiusForPixels, clusterByAngle, zoomLevel, type Cluster } from '../../core/clustering/screenClusters'
import { clusterBeamHeight } from '../../core/events/beamHeight'
import { categoryIndex, EVENT_CATEGORIES, type GlobeEvent } from '../../core/events/GlobeEvent'
import { writeLatLngToArray } from '../../core/geo/latLngToVector'
import { grownHeight } from '../../core/motion/spawn'
import { CAMERA_FOV, visualConfig } from '../../shared/config/visualConfig'
import { FRAME_ORDER } from '../../shared/frameOrder'
import { useEventStore } from '../../store/eventStore'
import { useGlobeStore } from '../../store/globeStore'
import { useSelectionStore } from '../../store/selectionStore'
import { STATE_HOVERED, STATE_SELECTED, type EventInstanceData } from './eventInstanceData'

/** On first load, beams rise in a wave over this long. */
const INITIAL_STAGGER_S = 1.4
const GOLDEN_RATIO_FRACTION = 0.6180339887

type Growth = { from: number; to: number; start: number }

type ClusterState = {
  data: EventInstanceData | null
  events: GlobeEvent[] | null
  directions: Float32Array
  importance: Float32Array
  categories: Uint8Array
  idToIndex: Map<string, number>
  /** Cluster index per event, for highlighting a selected event inside a cluster. */
  clusterOf: Int32Array
  level: number
  radiusPx: number
  /** Pin height params at the last rebuild, to detect slider changes. */
  heightKey: string
  viewportHeight: number
  /** Growth per representative event id, so surviving beams animate between heights. */
  growth: Map<string, Growth>
  hoveredId: string | null
  selectedId: string | null
}

/**
 * Re-clusters only when the events, the zoom step, the cluster radius, the
 * pin heights or the viewport height change, then writes per-instance attributes. Hover and
 * selection states are rewritten whenever they change.
 */
export function useClusters(data: EventInstanceData): void {
  const state = useRef<ClusterState>({
    data: null,
    events: null,
    directions: new Float32Array(0),
    importance: new Float32Array(0),
    categories: new Uint8Array(0),
    idToIndex: new Map(),
    clusterOf: new Int32Array(0),
    level: NaN,
    radiusPx: NaN,
    heightKey: '',
    viewportHeight: NaN,
    growth: new Map(),
    hoveredId: null,
    selectedId: null,
  })

  useFrame(({ clock, size }) => {
    const s = state.current
    const { events } = useEventStore.getState()
    const now = clock.elapsedTime
    let rebuild = false
    let firstLoad = false

    if (s.data !== data) {
      s.data = data
      rebuild = true
    }
    if (events !== s.events) {
      firstLoad = !s.events || s.events.length === 0
      indexEvents(s, events)
      s.growth.clear()
      rebuild = true
    }

    const distance = useGlobeStore.getState().distance
    const level = zoomLevel(distance)
    const radiusPx = visualConfig.eventPoints.clusterRadiusPx
    const heights = visualConfig.pinHeights
    const heightKey = `${heights.base}|${heights.perImportance}|${heights.clusterGrowth}|${heights.clusterMax}`
    if (level !== s.level || radiusPx !== s.radiusPx || size.height !== s.viewportHeight || heightKey !== s.heightKey) {
      s.level = level
      s.radiusPx = radiusPx
      s.viewportHeight = size.height
      s.heightKey = heightKey
      rebuild = true
    }

    let statesDirty = false
    if (rebuild && events.length > 0) {
      const angle = angularRadiusForPixels(radiusPx, distance, CAMERA_FOV, size.height)
      const clusters = clusterByAngle(s.directions, s.importance, angle).slice(0, data.capacity)
      writeInstances(s, data, clusters, events, now, firstLoad)
      useEventStore.getState().setClusters(clusters)
      statesDirty = true
    }

    const { hoveredId, selectedId } = useSelectionStore.getState()
    if (statesDirty || hoveredId !== s.hoveredId || selectedId !== s.selectedId) {
      s.hoveredId = hoveredId
      s.selectedId = selectedId
      writeStates(s, data, useEventStore.getState().clusters)
    }
  }, FRAME_ORDER.clusters)
}

function indexEvents(s: ClusterState, events: GlobeEvent[]): void {
  s.events = events
  s.directions = new Float32Array(events.length * 3)
  s.importance = new Float32Array(events.length)
  s.categories = new Uint8Array(events.length)
  s.clusterOf = new Int32Array(events.length)
  s.idToIndex = new Map()
  events.forEach((e, i) => {
    writeLatLngToArray(s.directions, i * 3, e.lat, e.lng)
    s.importance[i] = e.importance
    s.categories[i] = categoryIndex(e.category)
    s.idToIndex.set(e.id, i)
  })
}

function writeInstances(
  s: ClusterState,
  data: EventInstanceData,
  clusters: Cluster[],
  events: GlobeEvent[],
  now: number,
  stagger: boolean,
): void {
  const direction = data.direction.array as Float32Array
  const category = data.category.array as Float32Array
  const growth = data.growth.array as Float32Array
  const members = data.members.array as Float32Array
  const nextGrowth = new Map<string, Growth>()
  const categoryCounts = new Uint16Array(EVENT_CATEGORIES.length)

  clusters.forEach((cluster, i) => {
    const rep = cluster.representative
    const key = events[rep].id
    const to = clusterBeamHeight(cluster.maxImportance, cluster.members.length, visualConfig.pinHeights)
    const previous = s.growth.get(key)
    let g: Growth
    if (!previous) {
      const delay = stagger ? ((i * GOLDEN_RATIO_FRACTION) % 1) * INITIAL_STAGGER_S : 0
      g = { from: 0, to, start: now + delay }
    } else if (previous.to === to) {
      g = previous
    } else {
      g = { from: grownHeight(previous.from, previous.to, previous.start, now), to, start: now }
    }
    nextGrowth.set(key, g)

    // Clusters take the colour of their most common category; ties go to the representative.
    categoryCounts.fill(0)
    let dominant = s.categories[rep]
    for (const m of cluster.members) {
      s.clusterOf[m] = i
      const c = s.categories[m]
      if (++categoryCounts[c] > categoryCounts[dominant]) dominant = c
    }

    direction.set(s.directions.subarray(rep * 3, rep * 3 + 3), i * 3)
    category[i] = dominant
    growth[i * 3] = g.from
    growth[i * 3 + 1] = g.to
    growth[i * 3 + 2] = g.start
    members[i] = cluster.members.length
  })

  s.growth = nextGrowth
  data.count = clusters.length
  data.direction.needsUpdate = true
  data.category.needsUpdate = true
  data.growth.needsUpdate = true
  data.members.needsUpdate = true
}

function writeStates(s: ClusterState, data: EventInstanceData, clusters: Cluster[]): void {
  const stateArray = data.state.array as Float32Array
  stateArray.fill(0, 0, data.count)

  const hovered = s.hoveredId === null ? undefined : s.idToIndex.get(s.hoveredId)
  if (hovered !== undefined) {
    const i = s.clusterOf[hovered]
    if (clusters[i]?.representative === hovered) stateArray[i] += STATE_HOVERED
  }
  const selected = s.selectedId === null ? undefined : s.idToIndex.get(s.selectedId)
  if (selected !== undefined && s.clusterOf[selected] < data.count) stateArray[s.clusterOf[selected]] += STATE_SELECTED
  data.state.needsUpdate = true
}
