import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Cluster } from '../../core/clustering/screenClusters'
import { snapTarget } from '../../core/picking/magneticSnap'
import { FRAME_ORDER } from '../../shared/frameOrder'
import { useEventStore } from '../../store/eventStore'
import { useGestureStore } from '../../store/gestureStore'
import { useGlobeStore } from '../../store/globeStore'
import { useSelectionStore } from '../../store/selectionStore'

/**
 * Each frame, snaps the cursor to the nearest front-facing beam (sticky, see
 * snapTarget) and publishes it as the hovered id. Nothing is hovered mid-drag.
 */
export function usePointerPicking(): void {
  const last = useRef<{ index: number; clusters: Cluster[] | null }>({ index: -1, clusters: null })

  useFrame(() => {
    const { cursor } = useGestureStore.getState()
    const { isDragging } = useGlobeStore.getState()
    const { screen, clusters, events } = useEventStore.getState()
    const selection = useSelectionStore.getState()
    const l = last.current

    if (l.clusters !== clusters) {
      // Re-clustered: carry the hover over to the same representative if it survived.
      l.clusters = clusters
      l.index = clusters.findIndex((c) => events[c.representative]?.id === selection.hoveredId)
    }

    const index = cursor && !isDragging ? snapTarget(screen, cursor.x, cursor.y, l.index) : -1
    l.index = index
    const id = index >= 0 && index < clusters.length ? events[clusters[index].representative].id : null
    if (id !== selection.hoveredId) selection.setHoveredId(id)
  }, FRAME_ORDER.picking)
}
