import { useFrame } from '@react-three/fiber'
import { useMemo, type RefObject } from 'react'
import { MathUtils, Matrix4, type Group } from 'three'
import { isAtRest, predictOrientation, stepInertia } from '../../core/motion/inertia'
import { visualConfig } from '../../shared/config/visualConfig'
import { FRAME_ORDER } from '../../shared/frameOrder'
import { useGlobeStore } from '../../store/globeStore'
import { useProjectionStore } from '../../store/projectionStore'

const MAX_FRAME_S = 0.1
/** Matrix changes below this are treated as "the globe didn't move". */
const MOVE_EPSILON = 1e-7

/**
 * Advances free-spin inertia, eases the globe group's rotation and the camera
 * distance towards the store's targets, then publishes the projection if it
 * changed. Reads the store, never waits on input.
 */
export function useGlobeTransform(groupRef: RefObject<Group | null>): void {
  const mvp = useMemo(() => new Matrix4(), [])

  useFrame(({ camera, size }, delta) => {
    const group = groupRef.current
    if (!group) return
    const dt = Math.min(delta, MAX_FRAME_S)

    const store = useGlobeStore.getState()
    if (!store.isDragging && !isAtRest(store.velocity)) {
      const next = stepInertia({ yaw: store.yaw, pitch: store.pitch }, store.velocity, dt)
      store.setOrientation(next.orientation.yaw, next.orientation.pitch)
      store.setVelocity(next.velocity)
    }

    const target = useGlobeStore.getState()
    // While dragging, run ahead of the last input sample at the drag's speed so
    // low-rate input (hands at ~20 Hz) moves continuously instead of in steps.
    const { yaw, pitch } = target.isDragging
      ? predictOrientation(target, target.velocity, (performance.now() - target.lastInputAt) / 1000, visualConfig.motion.predictionLead)
      : target
    const distance = target.distance
    const damping = visualConfig.motion.damping
    group.rotation.y = MathUtils.damp(group.rotation.y, yaw, damping, dt)
    group.rotation.x = MathUtils.damp(group.rotation.x, pitch, damping, dt)
    camera.position.z = MathUtils.damp(camera.position.z, distance, damping * 0.6, dt)

    group.updateMatrixWorld()
    camera.updateMatrixWorld()
    mvp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(group.matrixWorld)

    const projection = useProjectionStore.getState()
    if (
      projection.width !== size.width ||
      projection.height !== size.height ||
      mvp.elements.some((v, i) => Math.abs(v - projection.mvp[i]) > MOVE_EPSILON)
    ) {
      projection.setProjection(mvp.elements, group.matrixWorld.elements, camera.position.toArray(), size.width, size.height)
    }
  }, FRAME_ORDER.globeTransform)
}
