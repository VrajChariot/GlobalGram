import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import { MathUtils, type Group } from 'three'
import { isAtRest } from '../../core/motion/inertia'
import { bobOffset, IDLE_SPIN_RAD_PER_S, idleWeight } from '../../core/motion/idleMotion'
import { GLOBE_LIFT } from '../../shared/config/visualConfig'
import { FRAME_ORDER } from '../../shared/frameOrder'
import { useGlobeStore } from '../../store/globeStore'
import { useHandStore } from '../../store/handStore'
import { useSelectionStore } from '../../store/selectionStore'

const MAX_FRAME_S = 0.1
/** How fast the bob settles back when input resumes (1/s). */
const BOB_DAMPING = 4

/**
 * Ambient motion while nobody is interacting: a slow spin and a gentle bob,
 * starting 2 s after the last input with no hand in view. Any input, a hand
 * appearing, or an open selection stops it at once (the bob eases back).
 */
export function useIdleMotion(groupRef: RefObject<Group | null>): void {
  useFrame(({ clock }, delta) => {
    const group = groupRef.current
    if (!group) return
    const dt = Math.min(delta, MAX_FRAME_S)
    const globe = useGlobeStore.getState()

    const quiet =
      !globe.isDragging &&
      isAtRest(globe.velocity) &&
      useHandStore.getState().primary === null &&
      useSelectionStore.getState().selectedId === null
    const weight = quiet ? idleWeight(performance.now() - globe.lastInputAt) : 0

    // Spin by moving the target, not lastInputAt: idle isn't input.
    if (weight > 0) globe.setOrientation(globe.yaw + IDLE_SPIN_RAD_PER_S * weight * dt, globe.pitch)
    group.position.y = MathUtils.damp(group.position.y, GLOBE_LIFT + bobOffset(clock.elapsedTime) * weight, BOB_DAMPING, dt)
  }, FRAME_ORDER.idleMotion)
}
