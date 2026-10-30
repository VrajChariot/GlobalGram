import { useEffect, useRef } from 'react'
import { INITIAL_GESTURE_STATE, type GestureEffect, type HandInput } from '../../core/gestures/GestureState'
import { stepGesture } from '../../core/gestures/gestureMachine'
import { MIN_FLING_SPEED } from '../../core/gestures/thresholds'
import { trackVelocity, velocityOverWindow, ZERO_VELOCITY, type AngularVelocity, type OrientationSample } from '../../core/motion/inertia'
import { applyDrag, clampDistance } from '../../core/motion/orbit'
import { useGestureStore } from '../../store/gestureStore'
import { useGlobeStore } from '../../store/globeStore'
import { useHandStore, type PrimaryHand, type SecondaryHand } from '../../store/handStore'
import { useCoachStore } from '../../store/coachStore'
import { useSelectionStore } from '../../store/selectionStore'

/** Samples older than this are dropped; the fling only looks at the last 200 ms. */
const SAMPLE_HISTORY_MS = 400

export type GestureHandlers = {
  onSelect: () => void
  onOpenPalm: () => void
}

/**
 * Runs the gesture machine on every tracker frame and applies its effects:
 * drags rotate the globe (with inertia on release), two-hand spans zoom it,
 * taps select, and an open palm calls onOpenPalm.
 */
export function useGestureController(handlers: GestureHandlers): void {
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    let state = INITIAL_GESTURE_STATE
    let lastDragAt = 0
    let firstDrag = false
    let samples: OrientationSample[] = []
    let zoomStartDistance = 0

    const apply = (effect: GestureEffect, time: number) => {
      const globe = useGlobeStore.getState()
      switch (effect.type) {
        case 'dragStart':
        case 'zoomStart':
          globe.setDragging(true)
          globe.setVelocity(ZERO_VELOCITY)
          lastDragAt = time
          firstDrag = true
          samples = [{ time, yaw: globe.yaw, pitch: globe.pitch }]
          zoomStartDistance = globe.distance
          break
        case 'drag': {
          const width = window.innerWidth
          const next = applyDrag({ yaw: globe.yaw, pitch: globe.pitch }, effect.dx / width, effect.dy / width)
          // The first drag carries the whole 3% threshold jump: rotate by it, but keep it out of the
          // speed estimate, or the render loop's prediction would overshoot.
          if (!firstDrag) {
            globe.setVelocity(trackVelocity(globe.velocity, next.yaw - globe.yaw, next.pitch - globe.pitch, (time - lastDragAt) / 1000))
          }
          firstDrag = false
          globe.setOrientation(next.yaw, next.pitch)
          lastDragAt = time
          samples.push({ time, yaw: next.yaw, pitch: next.pitch })
          samples = samples.filter((s) => s.time >= time - SAMPLE_HISTORY_MS)
          break
        }
        case 'dragEnd':
          // Up to when the pinch began opening: a confirmed release arrives a little later.
          globe.setVelocity(flingVelocity(samples, effect.releasedAt))
          globe.setDragging(false)
          useCoachStore.getState().learn('rotate')
          break
        case 'zoom':
          globe.setDistance(clampDistance(zoomStartDistance * effect.scale))
          break
        case 'zoomEnd':
          globe.setDragging(false)
          useCoachStore.getState().learn('zoom')
          break
        case 'select':
          latest.current.onSelect()
          break
        case 'openPalm':
          if (useSelectionStore.getState().selectedId !== null) useCoachStore.getState().learn('close')
          latest.current.onOpenPalm()
          break
      }
      globe.setLastInputAt(performance.now())
    }

    return useHandStore.subscribe((hands, previous) => {
      if (!hands.frame || hands.frame === previous.frame) return
      // Presence comes from this frame, not the held hand state: the machine has its own hand-loss grace.
      const seen = hands.frame.hands.length > 0
      const time = hands.frame.timestamp
      const step = stepGesture(state, {
        time,
        viewportWidth: window.innerWidth,
        primary: seen ? toInput(hands.primary) : null,
        secondary: seen ? toInput(hands.secondary) : null,
      })
      state = step.state
      for (const effect of step.effects) apply(effect, time)
      if (useGestureStore.getState().phase !== state.phase) useGestureStore.getState().setPhase(state.phase)
    })
  }, [])
}

/** Release velocity over the end of the drag; slow releases don't fling. */
function flingVelocity(samples: OrientationSample[], releaseTime: number): AngularVelocity {
  const v = velocityOverWindow(samples, releaseTime)
  return Math.hypot(v.yaw, v.pitch) < MIN_FLING_SPEED ? ZERO_VELOCITY : v
}

function toInput(hand: PrimaryHand | SecondaryHand | null): HandInput | null {
  return hand ? { pinchDist: hand.features.pinchDist, pinchPoint: hand.pinchPoint, openness: hand.features.openness } : null
}
