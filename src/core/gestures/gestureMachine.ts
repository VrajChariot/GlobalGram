import type { Point } from '../hands/handFeatures'
import { INITIAL_PINCH, stepPinch } from '../hands/pinchDetector'
import { INITIAL_GESTURE_STATE, type GestureEffect, type GestureInput, type GestureState, type HandInput } from './GestureState'
import {
  DRAG_START_FRACTION,
  HAND_LOSS_MS,
  OPEN_PALM,
  OPEN_PALM_HOLD_MS,
  OPEN_PALM_THUMB_SPREAD,
  PINCH_END,
  RELEASE_CONFIRM_MS,
  TAP_MAX_MS,
} from './thresholds'

export type GestureStep = { state: GestureState; effects: GestureEffect[] }

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * The gesture state machine: a pure transition from (state, one tracker frame)
 * to (next state, effects). The caller applies the effects (rotate, zoom,
 * select); the machine never touches the globe.
 *
 * Idle → Hovering (hand seen) → PinchPending (pinch closes; see pinchDetector) →
 *   RotateDrag (pinch point moves ≥ 3% of the screen width) or
 *   select (released within 250 ms having moved < 3%), else back to Hovering.
 * Hovering / PinchPending → TwoHandZoom (the second hand pinches).
 * Opening the pinch returns to Hovering; no hand for 150 ms returns to Idle.
 * Mid-drag/zoom, a release must be confirmed (see RELEASE_CONFIRM_MS).
 */
export function stepGesture(state: GestureState, input: GestureInput): GestureStep {
  const effects: GestureEffect[] = []
  const { primary, secondary, time } = input

  if (!primary) {
    // Short dropouts keep the gesture alive, so a flicker never breaks a drag.
    if (state.phase === 'Idle' || time - state.lastSeenAt < HAND_LOSS_MS) return { state, effects }
    if (state.phase === 'RotateDrag') effects.push({ type: 'dragEnd', releasedAt: state.releaseSince ?? state.lastSeenAt })
    if (state.phase === 'TwoHandZoom') effects.push({ type: 'zoomEnd' })
    return { state: INITIAL_GESTURE_STATE, effects }
  }

  const primaryPinch = stepPinch(state.primaryPinch, primary.pinchDist, time)
  const secondaryPinch = secondary ? stepPinch(state.secondaryPinch, secondary.pinchDist, time) : INITIAL_PINCH
  const primaryPinching = primaryPinch.pinching
  const pinchOnset = primaryPinching && !state.primaryPinch.pinching
  const zoomReady = secondary !== null && secondaryPinch.pinching
  const dragThreshold = DRAG_START_FRACTION * input.viewportWidth
  let next: GestureState = { ...state, lastSeenAt: time, primaryPinch, secondaryPinch }

  switch (state.phase) {
    case 'Idle':
    case 'Hovering':
      if (zoomReady) next = startZoom(next, primary, secondary, effects)
      else if (pinchOnset) next = { ...next, phase: 'PinchPending', pinchStart: { time, point: primary.pinchPoint } }
      else next.phase = 'Hovering'
      break

    case 'PinchPending': {
      const start = state.pinchStart ?? { time, point: primary.pinchPoint }
      const moved = distance(primary.pinchPoint, start.point)
      if (zoomReady) {
        next = startZoom(next, primary, secondary, effects)
      } else if (!primaryPinching) {
        if (time - start.time <= TAP_MAX_MS && moved < dragThreshold) effects.push({ type: 'select', point: start.point })
        next = { ...next, phase: 'Hovering', pinchStart: null }
      } else if (moved >= dragThreshold) {
        // Include the movement that crossed the threshold, so the drag doesn't lose it.
        effects.push({ type: 'dragStart' }, { type: 'drag', dx: primary.pinchPoint.x - start.point.x, dy: primary.pinchPoint.y - start.point.y })
        next = { ...next, phase: 'RotateDrag', pinchStart: null, lastPoint: primary.pinchPoint }
      }
      break
    }

    case 'RotateDrag': {
      const release = confirmRelease(state, primaryPinching, primary.pinchDist, time)
      if (release === 'ended') {
        effects.push({ type: 'dragEnd', releasedAt: state.releaseSince ?? time })
        next = { ...next, phase: 'Hovering', lastPoint: null, releaseSince: null }
      } else if (release === 'pending') {
        // Hold still (no rotation) until the release is confirmed or the pinch comes back;
        // lastPoint is kept, so a resumed drag loses none of its movement.
        next.releaseSince = state.releaseSince ?? time
      } else {
        const last = state.lastPoint ?? primary.pinchPoint
        effects.push({ type: 'drag', dx: primary.pinchPoint.x - last.x, dy: primary.pinchPoint.y - last.y })
        next = { ...next, lastPoint: primary.pinchPoint, releaseSince: null }
      }
      break
    }

    case 'TwoHandZoom': {
      const release = secondary ? confirmRelease(state, secondaryPinch.pinching, secondary.pinchDist, time) : 'ended'
      if (release === 'ended' || !secondary) {
        effects.push({ type: 'zoomEnd' })
        next = { ...next, phase: 'Hovering', releaseSince: null }
      } else if (release === 'pending') {
        next.releaseSince = state.releaseSince ?? time
      } else {
        effects.push({ type: 'zoom', scale: state.zoomStartSpan / Math.max(distance(primary.pinchPoint, secondary.pinchPoint), 1) })
        next.releaseSince = null
      }
      break
    }
  }

  return { state: trackOpenPalm(next, primary, time, effects), effects }
}

/**
 * Whether a held pinch has really been let go: immediately if it opened past
 * PINCH_END, otherwise only once it has stayed open for RELEASE_CONFIRM_MS.
 */
function confirmRelease(state: GestureState, pinching: boolean, pinchDist: number, time: number): 'held' | 'pending' | 'ended' {
  if (pinching) return 'held'
  if (pinchDist > PINCH_END) return 'ended'
  return time - (state.releaseSince ?? time) >= RELEASE_CONFIRM_MS ? 'ended' : 'pending'
}

function startZoom(state: GestureState, primary: HandInput, secondary: HandInput | null, effects: GestureEffect[]): GestureState {
  effects.push({ type: 'zoomStart' })
  const span = secondary ? distance(primary.pinchPoint, secondary.pinchPoint) : 1
  return { ...state, phase: 'TwoHandZoom', pinchStart: null, releaseSince: null, zoomStartSpan: Math.max(span, 1) }
}

/**
 * Fires openPalm once per opening, after a flat palm (fingers extended, thumb
 * spread) has been held for OPEN_PALM_HOLD_MS while hovering.
 */
function trackOpenPalm(state: GestureState, primary: HandInput, time: number, effects: GestureEffect[]): GestureState {
  const flat = primary.openness > OPEN_PALM && primary.pinchDist > OPEN_PALM_THUMB_SPREAD
  if (state.phase !== 'Hovering' || !flat) {
    return state.palmSince === null && !state.palmFired ? state : { ...state, palmSince: null, palmFired: false }
  }
  const palmSince = state.palmSince ?? time
  if (!state.palmFired && time - palmSince >= OPEN_PALM_HOLD_MS) {
    effects.push({ type: 'openPalm' })
    return { ...state, palmSince, palmFired: true }
  }
  return { ...state, palmSince }
}
