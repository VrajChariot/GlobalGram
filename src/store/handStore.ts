import { create } from 'zustand'
import type { HandFeatures, Point } from '../core/hands/handFeatures'
import type { HandFrame, TrackedHand } from '../core/hands/HandFrame'

type TrackerStatus = 'idle' | 'loading' | 'ready' | 'error'

/** The hand that drives the cursor. */
export type PrimaryHand = {
  features: HandFeatures
  pinching: boolean
  /** Cursor in viewport CSS px (after the interaction box). */
  cursor: Point
  /** Thumb–index midpoint in viewport CSS px. */
  pinchPoint: Point
  /** Cursor velocity in px/s. */
  velocity: Point
}

/** The other hand, if two are up: what two-hand zoom needs. */
export type SecondaryHand = {
  features: HandFeatures
  pinchPoint: Point
}

export type TrackerStats = {
  /** Worker inference time for the last frame. */
  inferenceMs: number
  /** Capture → result processed. */
  latencyMs: number
  /** Results per second. */
  fps: number
}

type HandState = {
  status: TrackerStatus
  delegate: 'GPU' | 'CPU' | null
  /** WebGL renderer the GPU delegate runs on. */
  renderer: string | null
  error: string | null
  /** Latest tracker output exactly as the worker returned it (unmirrored), including empty frames. */
  frame: HandFrame | null
  /** Mirrored, unfiltered hands from the latest frame (normalised video coordinates). */
  raw: TrackedHand[]
  /** Same hands after One Euro filtering. */
  filtered: TrackedHand[]
  primary: PrimaryHand | null
  secondary: SecondaryHand | null
  /** performance.now() when a hand was last seen. */
  lastSeenAt: number
  videoWidth: number
  videoHeight: number
  stats: TrackerStats
  setStatus: (status: TrackerStatus, delegate?: 'GPU' | 'CPU' | null, renderer?: string | null, error?: string | null) => void
  setFrame: (frame: HandFrame) => void
  setHands: (
    raw: TrackedHand[],
    filtered: TrackedHand[],
    primary: PrimaryHand | null,
    secondary: SecondaryHand | null,
    lastSeenAt: number,
  ) => void
  setVideoSize: (videoWidth: number, videoHeight: number) => void
  setStats: (stats: TrackerStats) => void
}

export const useHandStore = create<HandState>()((set) => ({
  status: 'idle',
  delegate: null,
  renderer: null,
  error: null,
  frame: null,
  raw: [],
  filtered: [],
  primary: null,
  secondary: null,
  lastSeenAt: 0,
  videoWidth: 1280,
  videoHeight: 720,
  stats: { inferenceMs: 0, latencyMs: 0, fps: 0 },
  setStatus: (status, delegate = null, renderer = null, error = null) => set({ status, delegate, renderer, error }),
  setFrame: (frame) => set({ frame }),
  setHands: (raw, filtered, primary, secondary, lastSeenAt) => set({ raw, filtered, primary, secondary, lastSeenAt }),
  setVideoSize: (videoWidth, videoHeight) => set({ videoWidth, videoHeight }),
  setStats: (stats) => set({ stats }),
}))
