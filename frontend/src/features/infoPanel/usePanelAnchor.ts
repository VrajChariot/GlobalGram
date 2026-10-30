import { addAfterEffect } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { beamHeight } from '../../core/events/beamHeight'
import type { GlobeEvent } from '../../core/events/GlobeEvent'
import { latLngToVector } from '../../core/geo/latLngToVector'
import { facing, projectToScreen } from '../../core/geo/screenProjection'
import { visualConfig } from '../../shared/config/visualConfig'
import { useProjectionStore } from '../../store/projectionStore'

export type PanelAnchor = { x: number; y: number; visible: boolean }

/** Points this close to the horizon count as hidden behind the globe. */
const MIN_FACING = 0.05

/**
 * Calls `onFrame` after every rendered frame with where the event's pin is on
 * screen, so the panel's leader line tracks it as the globe moves.
 */
export function usePanelAnchor(event: GlobeEvent | null, onFrame: (anchor: PanelAnchor) => void): void {
  const callback = useRef(onFrame)
  useEffect(() => {
    callback.current = onFrame
  })

  useEffect(() => {
    if (!event) return
    const direction = latLngToVector(event.lat, event.lng)
    const out = new Float32Array(2)
    return addAfterEffect(() => {
      const { mvp, model, camera, width, height } = useProjectionStore.getState()
      const top = 1 + beamHeight(event.importance, visualConfig.pinHeights)
      const visible =
        facing(model, camera, direction.x, direction.y, direction.z) > MIN_FACING &&
        projectToScreen(mvp, direction.x * top, direction.y * top, direction.z * top, width, height, out, 0)
      callback.current({ x: out[0], y: out[1], visible })
    })
  }, [event])
}
