import type { TrackedHand } from '../../core/hands/HandFrame'
import type { TrackerDelegate, WorkerRequest, WorkerResponse } from './protocol'

export type HandTrackerResult = {
  /** Raw MediaPipe hands: unmirrored, unfiltered, normalised video coordinates. */
  hands: TrackedHand[]
  /** performance.now() at capture. */
  timestamp: number
  inferenceMs: number
}

const ASSET_BASE = `${import.meta.env.BASE_URL}mediapipe`

export type TrackerReady = { delegate: TrackerDelegate; renderer: string | null }

/** GPU unless the page URL says `?delegate=CPU` (for comparing the two). */
function requestedDelegate(): TrackerDelegate {
  return new URLSearchParams(self.location.search).get('delegate')?.toUpperCase() === 'CPU' ? 'CPU' : 'GPU'
}

/**
 * Main-thread side of the hand-tracking worker. At most one frame is in
 * flight: while the worker is busy, new frames are dropped, never queued.
 */
export class HandTrackerClient {
  private readonly worker: Worker
  private busy = false
  private ready = false
  private disposed = false
  onResult: ((result: HandTrackerResult) => void) | null = null
  onError: ((message: string) => void) | null = null

  constructor() {
    this.worker = new Worker(new URL('./handTracker.worker.ts', import.meta.url), { type: 'module' })
  }

  init(): Promise<TrackerReady> {
    return new Promise((resolve, reject) => {
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data
        if (message.type === 'ready') {
          this.ready = true
          resolve({ delegate: message.delegate, renderer: message.renderer })
        } else if (message.type === 'error') {
          this.busy = false
          if (this.ready) this.onError?.(message.message)
          else reject(new Error(message.message))
        } else {
          this.busy = false
          this.onResult?.(message)
        }
      }
      this.worker.onerror = (event) => reject(new Error(event.message))
      const origin = self.location.origin
      this.send({
        type: 'init',
        wasmBaseUrl: new URL(`${ASSET_BASE}/wasm`, origin).href,
        modelUrl: new URL(`${ASSET_BASE}/hand_landmarker.task`, origin).href,
        delegate: requestedDelegate(),
      })
    })
  }

  /** Sends the current video frame. Returns false if it was dropped because the worker is busy. */
  async submit(video: HTMLVideoElement): Promise<boolean> {
    if (!this.ready || this.busy || this.disposed) return false
    this.busy = true
    const timestamp = performance.now()
    try {
      const bitmap = await createImageBitmap(video)
      if (this.disposed) {
        bitmap.close()
        return false
      }
      this.send({ type: 'frame', bitmap, timestamp }, [bitmap])
      return true
    } catch {
      this.busy = false
      return false
    }
  }

  dispose(): void {
    this.disposed = true
    this.worker.terminate()
  }

  private send(message: WorkerRequest, transfer: Transferable[] = []): void {
    this.worker.postMessage(message, transfer)
  }
}
