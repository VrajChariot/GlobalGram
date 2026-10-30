import { useReplayStore } from '../../store/replayStore'
import type { LandmarkRecording } from './landmarkRecorder'

/** Pause between loops, with the hand gone, so the gesture machine resets. */
const LOOP_GAP_MS = 600

/** Parses and sanity-checks a recording file. Throws with a readable message if it isn't one. */
export function parseRecording(text: string): LandmarkRecording {
  const data = JSON.parse(text) as Partial<LandmarkRecording>
  if (data.version !== 1 || !Array.isArray(data.frames) || !data.video) throw new Error('Not a GlobalGram landmark recording')
  if (data.frames.length === 0) throw new Error('Recording has no frames')
  return data as LandmarkRecording
}

/**
 * Plays a recording into the hand pipeline with its original timing, in place
 * of the camera, looping until stopped. Returns `stop`.
 */
export function startReplay(recording: LandmarkRecording, name: string): () => void {
  const frames = recording.frames
  const store = useReplayStore.getState()
  const first = frames[0].timestamp
  let index = 0
  let base = performance.now()
  let timer = 0
  let stopped = false

  const schedule = () => {
    if (stopped) return
    if (index >= frames.length) {
      // Hand leaves between loops.
      store.setFrame({ hands: [], timestamp: performance.now(), inferenceMs: 0 })
      index = 0
      base = performance.now() + LOOP_GAP_MS
    }
    const frame = frames[index]
    const due = base + (frame.timestamp - first)
    timer = window.setTimeout(() => {
      store.setFrame({ hands: frame.hands, timestamp: performance.now(), inferenceMs: frame.inferenceMs ?? 0 })
      index++
      schedule()
    }, Math.max(0, due - performance.now()))
  }

  store.setActive(true, name, recording.video)
  schedule()
  return () => {
    stopped = true
    window.clearTimeout(timer)
    useReplayStore.getState().setActive(false)
  }
}
