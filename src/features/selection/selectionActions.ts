import { distanceToSplit, splitAngle, type Cluster } from '../../core/clustering/screenClusters'
import { vectorToLatLng, writeLatLngToArray } from '../../core/geo/latLngToVector'
import { ZERO_VELOCITY } from '../../core/motion/inertia'
import { clampDistance, orientationFacing } from '../../core/motion/orbit'
import type { GlobeEvent } from '../../core/events/GlobeEvent'
import { CAMERA_FOV, visualConfig } from '../../shared/config/visualConfig'
import { useEventStore } from '../../store/eventStore'
import { useGlobeStore } from '../../store/globeStore'
import { useProjectionStore } from '../../store/projectionStore'
import { useSelectionStore } from '../../store/selectionStore'

/** Selecting a cluster always zooms in at least this much. */
const MIN_FOCUS_ZOOM = 0.9

/** Select what's hovered: a single event is selected, a cluster is zoomed into until it splits. */
export function selectHovered(): void {
  const { hoveredId, setSelectedId } = useSelectionStore.getState()
  if (!hoveredId) return
  const { clusters, events } = useEventStore.getState()
  const cluster = clusters.find((c) => events[c.representative].id === hoveredId)
  if (cluster && cluster.members.length > 1) focusCluster(cluster, events)
  else setSelectedId(hoveredId)
}

export function clearSelection(): void {
  useSelectionStore.getState().setSelectedId(null)
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
  const target = orientationFacing(centre.lat, centre.lng, globe.yaw)

  globe.setVelocity(ZERO_VELOCITY)
  globe.setOrientation(target.yaw, target.pitch)
  globe.setDistance(clampDistance(Math.min(globe.distance * MIN_FOCUS_ZOOM, splitAt)))
  globe.setLastInputAt(performance.now())
}
