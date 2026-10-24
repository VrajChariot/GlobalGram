/// <reference lib="webworker" />
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'
import type { TrackedHand } from '../../core/hands/HandFrame'
import type { TrackerDelegate, WorkerRequest, WorkerResponse } from './protocol'

const scope = self as unknown as DedicatedWorkerGlobalScope
let landmarker: HandLandmarker | null = null
let lastTimestamp = -Infinity

/** Renderers that are "WebGL" but actually run on the CPU. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|software|basic render/i

function post(message: WorkerResponse): void {
  scope.postMessage(message)
}

/** The WebGL2 context MediaPipe will run on, and its renderer name. */
function createGpuCanvas(): { canvas: OffscreenCanvas; renderer: string } {
  const canvas = new OffscreenCanvas(1, 1)
  const gl = canvas.getContext('webgl2')
  if (!gl) throw new Error('WebGL2 is not available in the worker')
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
  if (SOFTWARE_RENDERER.test(renderer)) throw new Error(`WebGL is software-rendered (${renderer}); check chrome://gpu`)
  return { canvas, renderer }
}

async function init(wasmBaseUrl: string, modelUrl: string, delegate: TrackerDelegate): Promise<void> {
  try {
    const gpu = delegate === 'GPU' ? createGpuCanvas() : null
    // `true`: the ES-module WASM loader, which works in a module worker (no importScripts).
    const fileset = await FilesetResolver.forVisionTasks(wasmBaseUrl, true)
    landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modelUrl, delegate },
      // MediaPipe must run on this exact canvas, the one whose renderer we checked.
      canvas: gpu?.canvas,
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    })
    post({ type: 'ready', delegate, renderer: gpu?.renderer ?? null })
  } catch (error) {
    // No silent CPU fallback: a GPU failure should be visible, not just slow.
    post({ type: 'error', message: `${delegate} hand tracking failed: ${error instanceof Error ? error.message : String(error)}` })
  }
}

function toHands(result: HandLandmarkerResult): TrackedHand[] {
  return result.landmarks.map((landmarks, i) => {
    const category = result.handedness[i]?.[0]
    return {
      landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
      handedness: category?.categoryName === 'Left' ? 'Left' : 'Right',
      score: category?.score ?? 0,
    }
  })
}

function detect(bitmap: ImageBitmap, timestamp: number): void {
  try {
    if (!landmarker) throw new Error('hand tracker not initialised')
    // MediaPipe requires strictly increasing timestamps.
    const t = Math.max(timestamp, lastTimestamp + 0.001)
    lastTimestamp = t
    const start = performance.now()
    const result = landmarker.detectForVideo(bitmap, t)
    post({ type: 'result', hands: toHands(result), timestamp, inferenceMs: performance.now() - start })
  } catch (error) {
    post({ type: 'error', message: String(error) })
  } finally {
    bitmap.close()
  }
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  if (message.type === 'init') void init(message.wasmBaseUrl, message.modelUrl, message.delegate)
  else detect(message.bitmap, message.timestamp)
}
