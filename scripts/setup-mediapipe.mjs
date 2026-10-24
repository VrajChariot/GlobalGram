// Puts MediaPipe's hand-tracking assets in public/mediapipe so they're served locally:
// the ES-module WASM build (copied from node_modules) and the hand landmarker model
// (downloaded once, Apache-2.0). Runs before `dev` and `build`; safe to re-run.
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const source = 'node_modules/@mediapipe/tasks-vision/wasm'
const target = 'public/mediapipe'

mkdirSync(join(target, 'wasm'), { recursive: true })
for (const file of readdirSync(source).filter((f) => f.includes('_module_'))) {
  copyFileSync(join(source, file), join(target, 'wasm', file))
}

const modelPath = join(target, 'hand_landmarker.task')
if (!existsSync(modelPath)) {
  console.log(`downloading ${MODEL_URL}`)
  const response = await fetch(MODEL_URL)
  if (!response.ok) throw new Error(`model download failed: ${response.status}`)
  writeFileSync(modelPath, Buffer.from(await response.arrayBuffer()))
}
console.log('mediapipe assets ready in', target)
