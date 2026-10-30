import { Leva } from 'leva'
import { useEffect, useRef, useState } from 'react'
import { useGestureConfigControls } from '../../shared/config/gestureConfig'
import { useVisualConfigControls } from '../../shared/config/visualConfig'
import { useDebugStore } from '../../store/debugStore'
import { useReplayStore } from '../../store/replayStore'
import { DebugReadouts } from './DebugReadouts'
import { downloadRecording, startLandmarkRecording, type LandmarkRecording } from './landmarkRecorder'
import { parseRecording, startReplay } from './landmarkReplayer'
import { LandmarkSkeleton } from './LandmarkSkeleton'

/**
 * Press D to toggle. Controls stay registered while hidden so values persist.
 * While debug is on: R records the landmark stream to a JSON download; L (or
 * dropping a recording on the window) replays one in place of the camera; P stops it.
 */
export function DebugOverlay() {
  const enabled = useDebugStore((s) => s.enabled)
  const [recording, setRecording] = useState(false)
  const stopRecording = useRef<(() => LandmarkRecording) | null>(null)
  const stopReplay = useRef<(() => void) | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const replaying = useReplayStore((s) => s.name)
  const [replayError, setReplayError] = useState<string | null>(null)

  const replayFileRef = useRef<(file: File) => Promise<void>>(async () => {})
  const replayFile = async (file: File) => {
    try {
      const recording = parseRecording(await file.text())
      stopReplay.current?.()
      stopReplay.current = startReplay(recording, file.name)
      setReplayError(null)
    } catch (error) {
      setReplayError(error instanceof Error ? error.message : String(error))
    }
  }
  useEffect(() => {
    replayFileRef.current = replayFile
  })
  useVisualConfigControls()
  useGestureConfigControls()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const key = e.key.toLowerCase()
      if (key === 'd') {
        const store = useDebugStore.getState()
        store.setEnabled(!store.enabled)
      } else if (key === 'r' && useDebugStore.getState().enabled) {
        if (stopRecording.current) {
          downloadRecording(stopRecording.current())
          stopRecording.current = null
          setRecording(false)
        } else {
          stopRecording.current = startLandmarkRecording()
          setRecording(true)
        }
      } else if (key === 'l' && useDebugStore.getState().enabled) {
        fileInput.current?.click()
      } else if (key === 'p') {
        stopReplay.current?.()
        stopReplay.current = null
      }
    }
    const onDragOver = (e: DragEvent) => {
      if (useDebugStore.getState().enabled) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      const file = e.dataTransfer?.files[0]
      if (!file || !useDebugStore.getState().enabled) return
      e.preventDefault()
      void replayFileRef.current(file)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return (
    <>
      {enabled && (
        <>
          <LandmarkSkeleton />
          <DebugReadouts />
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 font-mono text-[11px] text-cyan-100">
            {recording ? (
              <span className="text-red-400">● recording landmarks: R to stop and save</span>
            ) : replaying ? (
              <span className="text-amber-300">▶ replaying {replaying} (loop): P to stop</span>
            ) : (
              'R: record landmarks · L or drop a file: replay'
            )}
            {replayError && <span className="ml-2 text-red-400">{replayError}</span>}
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void replayFile(file)
              e.target.value = ''
            }}
          />
        </>
      )}
      <div className="pointer-events-auto">
        <Leva hidden={!enabled} titleBar={{ title: 'GlobalGram' }} />
      </div>
    </>
  )
}
