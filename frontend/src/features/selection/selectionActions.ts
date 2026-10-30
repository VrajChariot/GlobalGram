import { distanceToSplit, splitAngle, type Cluster } from '../../core/clustering/screenClusters'
import type { GlobeEvent } from '../../core/events/GlobeEvent'
import { vectorToLatLng, writeLatLngToArray } from '../../core/geo/latLngToVector'
import { ZERO_VELOCITY } from '../../core/motion/inertia'
import { clampDistance, orientationFacing } from '../../core/motion/orbit'
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

/** Select what's hovered: a single event is selected (and turned centre-left), a cluster is zoomed into until it splits. */
export function selectHovered(): void {
  const { hoveredId, setSelectedId } = useSelectionStore.getState()
  if (!hoveredId) return
  const { clusters, events } = useEventStore.getState()
  const cluster = clusters.find((c) => events[c.representative].id === hoveredId)
  if (cluster && cluster.members.length > 1) {
    focusCluster(cluster, events)
    return
  }
  setSelectedId(hoveredId)
  const event = events.find((e) => e.id === hoveredId)
  if (event) turnTo(event.lat, event.lng + SELECTED_OFFSET_DEG)
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

/** Turns the cluster's centre to face the camera and zooms in far enough to split it. */
function focusCluster(cluster: Cluster, events: GlobeEvent[]): void {
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
  const globe = useGlobeStore.getState()
  const splitAt = distanceToSplit(angle, visualConfig.eventPoints.clusterRadiusPx, CAMERA_FOV, height)

  turnTo(centre.lat, centre.lng)
  globe.setDistance(clampDistance(Math.min(globe.distance * MIN_FOCUS_ZOOM, splitAt)))
}
