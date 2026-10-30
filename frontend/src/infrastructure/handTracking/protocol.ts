import type { TrackedHand } from '../../core/hands/HandFrame'

export type TrackerDelegate = 'GPU' | 'CPU'

export type WorkerRequest =
  | { type: 'init'; wasmBaseUrl: string; modelUrl: string; delegate: TrackerDelegate }
  | { type: 'frame'; bitmap: ImageBitmap; timestamp: number }

export type WorkerResponse =
  /** `renderer`: the WebGL renderer MediaPipe got (GPU delegate only). */
  | { type: 'ready'; delegate: TrackerDelegate; renderer: string | null }
  | { type: 'error'; message: string }
  /** Raw MediaPipe output: unmirrored, unfiltered. */
  | { type: 'result'; hands: TrackedHand[]; timestamp: number; inferenceMs: number }
