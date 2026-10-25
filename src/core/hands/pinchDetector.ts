import { PINCH_END, PINCH_START } from '../gestures/thresholds'

/**
 * Pinch detection relative to the hand's own resting thumb–index distance.
 *
 * Fixed thresholds fail for some poses: with the other fingers curled, thumb
 * and index can rest ~0.25 apart (right at a fixed start threshold) and a tap
 * only reopens to ~0.30 (never past a fixed 0.40 release). So the detector
 * tracks the resting distance and works relative to it, while the spec's
 * PINCH_START / PINCH_END stay as caps: a pinch never needs to be tighter than
 * < 0.25 to start, nor reopen further than > 0.40 to end.
 */
export type PinchDetector = {
  pinching: boolean
  /** Resting (unpinched) thumb–index distance, smoothed. */
  rest: number
  /** Tightest distance during the current pinch. */
  tightest: number
  /** ms */
  lastTime: number
}

/** How fast the resting distance follows the hand (time constant, ms). */
const REST_TAU_MS = 600
/** A pinch starts below this share of the resting distance… */
const START_RATIO = 0.78
/** …and ends once it has reopened this share of the way back to rest… */
const RELEASE_SHARE = 0.5
/** …or by at least this much. */
const MIN_RELEASE_RISE = 0.06

export const INITIAL_PINCH: PinchDetector = { pinching: false, rest: PINCH_END, tightest: Infinity, lastTime: -Infinity }

export function pinchStartThreshold(d: PinchDetector): number {
  return Math.min(PINCH_START, d.rest * START_RATIO)
}

export function pinchEndThreshold(d: PinchDetector): number {
  const rise = Math.max(MIN_RELEASE_RISE, (d.rest - d.tightest) * RELEASE_SHARE)
  return Math.min(PINCH_END, d.tightest + rise)
}

export function stepPinch(d: PinchDetector, distance: number, time: number): PinchDetector {
  const dt = Number.isFinite(d.lastTime) ? Math.max(0, time - d.lastTime) : Infinity

  if (d.pinching) {
    const tightest = Math.min(d.tightest, distance)
    const next = { ...d, tightest, lastTime: time }
    return distance > pinchEndThreshold(next) ? { ...next, pinching: false, tightest: Infinity } : next
  }

  if (distance < pinchStartThreshold(d)) return { ...d, pinching: true, tightest: distance, lastTime: time }
  // Only an unpinched hand teaches the resting distance.
  const follow = dt === Infinity ? 1 : 1 - Math.exp(-dt / REST_TAU_MS)
  return { ...d, rest: d.rest + (distance - d.rest) * follow, lastTime: time }
}

/**
 * How far the fingers have closed towards a pinch: 0 at rest, 1 at the start
 * threshold (and while pinching). Drives the reticle's fill ring.
 */
export function pinchProgress(d: PinchDetector, distance: number): number {
  if (d.pinching) return 1
  const start = pinchStartThreshold(d)
  if (d.rest <= start) return 0
  return Math.min(1, Math.max(0, (d.rest - distance) / (d.rest - start)))
}
