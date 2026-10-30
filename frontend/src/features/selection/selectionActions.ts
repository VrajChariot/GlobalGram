import { distanceToSplit, splitAngle, type Cluster } from '../../core/clustering/screenClusters'
import type { GlobeEvent } from '../../core/events/GlobeEvent'
import { vectorToLatLng, writeLatLngToArray } from '../../core/geo/latLngToVector'
import { nextInStack, stackIds } from '../../core/clustering/stack'
import { ZERO_VELOCITY } from '../../core/motion/inertia'
import { clampDistance, MIN_DISTANCE, orientationFacing } from '../../core/motion/orbit'
import { gestureConfig } from '../../shared/config/gestureConfig'
import { CAMERA_FOV, visualConfig } from '../../shared/config/visualConfig'
import { useCoachStore } from '../../store/coachStore'
import { useEventStore } from '../../store/eventStore'
import { useGlobeStore } from '../../store/globeStore'
import { useProjectionStore } from '../../store/projectionStore'
import { useSelectionStore } from '../../store/selectionStore'

/** Selecting a cluster always zooms in at least this much. */
const MIN_FOCUS_ZOOM = 0.9
/**
 * A selected event is turned this far left of centre (degrees of longitude),
 * so it sits centre-left and the info panel on the right never covers it.
 */
const SELECTED_OFFSET_DEG = 20

/**
 * Select what's hovered: a single event is selected (and turned centre-left). A cluster is zoomed into
 * until it splits; one still clustered at the closest zoom (events at the same spot) is selected as a
 * stack, and selecting it again steps to its next event.
 */
export function selectHovered(): void {
  const { hoveredId, setSelectedId } = useSelectionStore.getState()
  if (!hoveredId) return
  const { clusters, events } = useEventStore.getState()
  const cluster = clusters.find((c) => events[c.representative].id === hoveredId)
  if (cluster && cluster.members.length > 1) {
    const focus = clusterFocus(cluster, events)
    if (useGlobeStore.getState().distance > MIN_DISTANCE + 1e-3) focusCluster(focus)
    else selectStack(cluster, events, focus.centre)
    return
  }
  setSelectedId(hoveredId)
  const event = events.find((e) => e.id === hoveredId)
  if (event) turnTo(event.lat, event.lng + SELECTED_OFFSET_DEG)
}

function selectStack(cluster: Cluster, events: GlobeEvent[], centre: { lat: number; lng: number }): void {
  const { selectedId, selectInStack } = useSelectionStore.getState()
  const ids = stackIds(cluster.members, events)
  selectInStack(nextInStack(ids, selectedId), ids)
  turnTo(centre.lat, centre.lng + SELECTED_OFFSET_DEG)
}

/** Step the selected stack by one event, as the info panel's buttons and a hand swipe do; false if no stack is selected. */
export function stepStack(step: 1 | -1): boolean {
  const { selectedId, stackIds: ids, selectInStack } = useSelectionStore.getState()
  const at = selectedId === null ? -1 : ids.indexOf(selectedId)
  if (at < 0) return false
  selectInStack(ids[(at + step + ids.length) % ids.length], ids)
  return true
}

/** A pinch-tap selects only in pinch mode; dwell mode selects by holding still instead. */
export function selectHoveredByPinch(): void {
  if (gestureConfig.selection.mode === 'pinch') selectHoveredByHand()
}

/** Select the hovered beam as a hand gesture: the user has learned to select, so the coach retires that tip. Mouse clicks use selectHovered. */
export function selectHoveredByHand(): void {
  if (useSelectionStore.getState().hoveredId) useCoachStore.getState().learn('select')
  selectHovered()
}

export function clearSelection(): void {
  useSelectionStore.getState().setSelectedId(null)
}

function turnTo(lat: number, lng: number): void {
  const globe = useGlobeStore.getState()
  const target = orientationFacing(lat, lng, globe.yaw)
  globe.setVelocity(ZERO_VELOCITY)
  globe.setOrientation(target.yaw, target.pitch)
  globe.setLastInputAt(performance.now())
}

type ClusterFocus = { centre: { lat: number; lng: number }; splitAt: number }

/** Where a cluster is centred, and the camera distance at which it would split. */
function clusterFocus(cluster: Cluster, events: GlobeEvent[]): ClusterFocus {
  const directions = new Float32Array(cluster.members.length * 3)
  let x = 0
  let y = 0
  let z = 0
  cluster.members.forEach((m, i) => {
    writeLatLngToArray(directions, i * 3, events[m].lat, events[m].lng)
    x += directions[i * 3]
    y += directions[i * 3 + 1]
    z += directions[i * 3 + 2]
  })
  const centre = x || y || z ? vectorToLatLng({ x, y, z }) : events[cluster.representative]

  // splitAngle expects member indices into `directions`, which is local here.
  const local: Cluster = { ...cluster, members: cluster.members.map((_, i) => i) }
  const angle = splitAngle(directions, local)
  const { height } = useProjectionStore.getState()
  return { centre, splitAt: distanceToSplit(angle, visualConfig.eventPoints.clusterRadiusPx, CAMERA_FOV, height) }
}

/** Turns the cluster's centre to face the camera and zooms in far enough to split it. */
function focusCluster({ centre, splitAt }: ClusterFocus): void {
  const globe = useGlobeStore.getState()
  turnTo(centre.lat, centre.lng)
  globe.setDistance(clampDistance(Math.min(globe.distance * MIN_FOCUS_ZOOM, splitAt)))
}
