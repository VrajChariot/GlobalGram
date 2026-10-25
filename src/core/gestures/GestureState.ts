import type { Point } from '../hands/handFeatures'
import { INITIAL_PINCH, type PinchDetector } from '../hands/pinchDetector'

export type GesturePhase = 'Idle' | 'Hovering' | 'PinchPending' | 'RotateDrag' | 'TwoHandZoom'

/** What the machine needs from one hand, in screen pixels. */
export type HandInput = {
  /** From raw (unfiltered) fingertips: smoothing would smear quick taps. */
  pinchDist: number
  /** Thumb–index midpoint: stable through the pinch, so movement is measured here. */
  pinchPoint: Point
  /** 0 = fist, 1 = flat open hand. */
  openness: number
}

export type GestureInput = {
  /** ms */
  time: number
  viewportWidth: number
  /** The cursor hand, or null if no hand was detected in this frame. */
  primary: HandInput | null
  secondary: HandInput | null
}

export type GestureEffect =
  | { type: 'select'; point: Point }
  | { type: 'dragStart' }
  /** Pixels moved since the previous drag effect. */
  | { type: 'drag'; dx: number; dy: number }
  /** `releasedAt`: when the pinch began opening (ms), so the fling is measured up to then. */
  | { type: 'dragEnd'; releasedAt: number }
  | { type: 'zoomStart' }
  /** Hand span at zoom start ÷ span now: < 1 when the hands spread apart. */
  | { type: 'zoom'; scale: number }
  | { type: 'zoomEnd' }
  | { type: 'openPalm' }

export type GestureState = {
  phase: GesturePhase
  /** ms; when a hand was last seen, for the hand-loss grace period. */
  lastSeenAt: number
  /** Pinch state per hand, relative to each hand's resting distance. A pinch only starts on the primary's open → closed edge. */
  primaryPinch: PinchDetector
  secondaryPinch: PinchDetector
  pinchStart: { time: number; point: Point } | null
  /** Last pinch point applied to the drag. */
  lastPoint: Point | null
  zoomStartSpan: number
  /** ms; when the pinch holding a drag or zoom started to open, while that release is unconfirmed. */
  releaseSince: number | null
  /** ms; since when the palm has been open, if it is. */
  palmSince: number | null
  /** The open palm already fired for this opening. */
  palmFired: boolean
}

export const INITIAL_GESTURE_STATE: GestureState = {
  phase: 'Idle',
  lastSeenAt: -Infinity,
  primaryPinch: INITIAL_PINCH,
  secondaryPinch: INITIAL_PINCH,
  pinchStart: null,
  lastPoint: null,
  zoomStartSpan: 1,
  releaseSince: null,
  palmSince: null,
  palmFired: false,
}
