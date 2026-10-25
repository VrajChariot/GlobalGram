import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Cluster } from '../../core/clustering/screenClusters'
import { snapTarget } from '../../core/picking/magneticSnap'
import { gestureConfig } from '../../shared/config/gestureConfig'
import { FRAME_ORDER } from '../../shared/frameOrder'
import { useEventStore } from '../../store/eventStore'
import { useGestureStore } from '../../store/gestureStore'
import { useGlobeStore } from '../../store/globeStore'
import { useSelectionStore } from '../../store/selectionStore'
import { selectHovered } from './selectionActions'

type PickingState = {
  index: number
  clusters: Cluster[] | null
  dwellId: string | null
  dwellSince: number
  dwellFired: boolean
}

/**
 * Each frame, magnetically locks the cursor onto the nearest front-facing beam
 * (sticky, see snapTarget) and publishes it as hovered. The lock freezes while
 * a hand pinch is pending, so a tap selects whatever was locked when the
 * fingers closed, even if pinching nudged the cursor. In dwell mode, holding
 * the lock on one beam selects it.
 */
export function useMagneticPicking(): void {
  const state = useRef<PickingState>({ index: -1, clusters: null, dwellId: null, dwellSince: 0, dwellFired: false })

  useFrame(() => {
    const { cursor, phase } = useGestureStore.getState()
    const { isDragging } = useGlobeStore.getState()
    const { screen, clusters, events } = useEventStore.getState()
    const selection = useSelectionStore.getState()
    const s = state.current

    if (s.clusters !== clusters) {
      // Re-clustered: carry the lock over to the same representative if it survived.
      s.clusters = clusters
      s.index = clusters.findIndex((c) => events[c.representative]?.id === selection.hoveredId)
    }

    const pinchPending = phase === 'PinchPending' && cursor?.source === 'hand'
    let index: number
    if (pinchPending) index = s.index < clusters.length ? s.index : -1
    else index = cursor && !isDragging ? snapTarget(screen, cursor.x, cursor.y, s.index) : -1
    s.index = index

    const id = index >= 0 ? events[clusters[index].representative].id : null
    if (id !== selection.hoveredId || index !== selection.hoveredIndex) selection.setHovered(id, index)

    // Dwell-to-select: hand only, while simply hovering a beam that isn't already selected.
    const now = performance.now()
    const dwelling =
      gestureConfig.selection.mode === 'dwell' && cursor?.source === 'hand' && phase === 'Hovering' && id !== null && id !== selection.selectedId
    if (!dwelling || id !== s.dwellId) {
      s.dwellId = dwelling ? id : null
      s.dwellSince = now
      s.dwellFired = false
    }
    let progress = dwelling && !s.dwellFired ? Math.min(1, (now - s.dwellSince) / gestureConfig.selection.dwellMs) : 0
    if (progress >= 1) {
      s.dwellFired = true
      progress = 0
      selectHovered()
    }
    if (progress !== selection.dwellProgress) selection.setDwellProgress(progress)
  }, FRAME_ORDER.picking)
}
