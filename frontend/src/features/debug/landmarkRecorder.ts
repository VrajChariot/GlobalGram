import type { HandFrame } from '../../core/hands/HandFrame'
import { useHandStore } from '../../store/handStore'

/** A recorded tracker stream: raw worker output, replayable through the full pipeline. */
export type LandmarkRecording = {
  version: 1
  recordedAt: string
  video: { width: number; height: number }
  viewport: { width: number; height: number }
  frames: RecordedFrame[]
}

/** A tracker result plus how long the worker took on it. */
export type RecordedFrame = HandFrame & { inferenceMs: number }

/**
 * Records every tracker result while running. Subscribes to the hand store,
 * so it captures exactly what the pipeline received, empty frames included.
 */
export function startLandmarkRecording(): () => LandmarkRecording {
  const frames: RecordedFrame[] = []
  const unsubscribe = useHandStore.subscribe((state, previous) => {
    if (state.frame && state.frame !== previous.frame) frames.push({ ...state.frame, inferenceMs: state.stats.inferenceMs })
  })
  const recordedAt = new Date().toISOString()

  return () => {
    unsubscribe()
    const { videoWidth, videoHeight } = useHandStore.getState()
    return {
      version: 1,
      recordedAt,
      video: { width: videoWidth, height: videoHeight },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      frames,
    }
  }
}

export function downloadRecording(recording: LandmarkRecording): void {
  const blob = new Blob([JSON.stringify(recording)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `landmarks-${recording.recordedAt.replace(/[:.]/g, '-')}.json`
  link.click()
  URL.revokeObjectURL(url)
}
