import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Cluster } from '../../core/clustering/screenClusters'
import { facing, projectToScreen } from '../../core/geo/screenProjection'
import { grownHeight, SPAWN_DURATION_S } from '../../core/motion/spawn'
import { FRAME_ORDER } from '../../shared/frameOrder'
import { useEventStore } from '../../store/eventStore'
import { useProjectionStore } from '../../store/projectionStore'
import type { EventInstanceData } from './eventInstanceData'

/** Beams this close to the horizon count as back-facing. */
const MIN_FACING = 0.05

/**
 * Projects every beam's base and (currently grown) tip to screen pixels for
 * picking and labels. Recomputed only when the globe/camera moves, the
 * clusters change, or beams are still growing.
 */
export function useScreenCache(data: EventInstanceData): void {
  const seen = useRef<{ version: number; clusters: Cluster[] | null; growingUntil: number }>({
    version: -1,
    clusters: null,
    growingUntil: 0,
  })

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    const projection = useProjectionStore.getState()
    const { clusters, screen, setScreen } = useEventStore.getState()
    const s = seen.current
    if (projection.version === s.version && clusters === s.clusters && now > s.growingUntil) return
    s.version = projection.version
    s.clusters = clusters

    const count = Math.min(clusters.length, data.count)
    let { base, tip, visible, facing: facings } = screen
    if (visible.length < count) {
      base = new Float32Array(data.capacity * 2)
      tip = new Float32Array(data.capacity * 2)
      visible = new Uint8Array(data.capacity)
      facings = new Float32Array(data.capacity)
    }

    const { mvp, model, camera, width, height } = projection
    const direction = data.direction.array as Float32Array
    const growth = data.growth.array as Float32Array
    let growingUntil = 0
    for (let i = 0; i < count; i++) {
      const x = direction[i * 3]
      const y = direction[i * 3 + 1]
      const z = direction[i * 3 + 2]
      const start = growth[i * 3 + 2]
      growingUntil = Math.max(growingUntil, start + SPAWN_DURATION_S)
      const top = 1 + grownHeight(growth[i * 3], growth[i * 3 + 1], start, now)
      facings[i] = facing(model, camera, x, y, z)
      visible[i] =
        facings[i] > MIN_FACING &&
        projectToScreen(mvp, x, y, z, width, height, base, i * 2) &&
        projectToScreen(mvp, x * top, y * top, z * top, width, height, tip, i * 2)
          ? 1
          : 0
    }
    s.growingUntil = growingUntil
    setScreen({ base, tip, visible, facing: facings, count, version: screen.version + 1 })
  }, FRAME_ORDER.screenCache)
}
