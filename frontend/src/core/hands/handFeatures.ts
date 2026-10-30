import { FINGERTIPS, LANDMARK, type Landmark, type TrackedHand } from './HandFrame'

/**
 * Mean fingertip-to-wrist distance (in palm lengths) of a fist and of a flat
 * open hand. Calibrated on a real hand: fist ≈ 0.93–1.08, flat palm ≈ 1.64.
 */
const FIST_REACH = 1.0
const OPEN_REACH = 1.62

export type Point = { x: number; y: number }

export type HandFeatures = {
  /** Thumb-tip to index-tip distance in palm lengths (wrist → middle MCP). */
  pinchDist: number
  /** 0 = fist, 1 = flat open hand. */
  openness: number
  /** Thumb–index midpoint, normalised video coordinates. */
  pinchPoint: Point
  /** Index fingertip, normalised video coordinates. */
  indexTip: Point
}

/**
 * Distance with x and z scaled by the video aspect ratio, so normalised
 * coordinates measure the same in both directions.
 */
function distance(a: Landmark, b: Landmark, aspect: number): number {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y, (a.z - b.z) * aspect)
}

/** Thumb-tip to index-tip distance in palm lengths. */
export function pinchDistance(hand: TrackedHand, aspect: number): number {
  const l = hand.landmarks
  return distance(l[LANDMARK.THUMB_TIP], l[LANDMARK.INDEX_TIP], aspect) / Math.max(distance(l[LANDMARK.WRIST], l[LANDMARK.MIDDLE_MCP], aspect), 1e-6)
}

export function computeHandFeatures(hand: TrackedHand, aspect: number): HandFeatures {
  const l = hand.landmarks
  const palm = Math.max(distance(l[LANDMARK.WRIST], l[LANDMARK.MIDDLE_MCP], aspect), 1e-6)
  const reach = FINGERTIPS.reduce((sum, tip) => sum + distance(l[tip], l[LANDMARK.WRIST], aspect), 0) / FINGERTIPS.length / palm
  const thumb = l[LANDMARK.THUMB_TIP]
  const index = l[LANDMARK.INDEX_TIP]
  return {
    pinchDist: distance(thumb, index, aspect) / palm,
    openness: Math.min(1, Math.max(0, (reach - FIST_REACH) / (OPEN_REACH - FIST_REACH))),
    pinchPoint: { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 },
    indexTip: { x: index.x, y: index.y },
  }
}

/** The pinch midpoint while pinching (so the cursor doesn't jump on pinch), else the index tip. */
export function cursorPoint(features: HandFeatures, pinching: boolean): Point {
  return pinching ? features.pinchPoint : features.indexTip
}

/** Velocity in units per second between two samples. */
export function velocityBetween(previous: Point, next: Point, dtSeconds: number): Point {
  if (dtSeconds <= 0) return { x: 0, y: 0 }
  return { x: (next.x - previous.x) / dtSeconds, y: (next.y - previous.y) / dtSeconds }
}
