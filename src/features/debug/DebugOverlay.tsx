import { Leva } from 'leva'
import { useEffect, useRef, useState } from 'react'
import { useGestureConfigControls } from '../../shared/config/gestureConfig'
import { useVisualConfigControls } from '../../shared/config/visualConfig'
import { useDebugStore } from '../../store/debugStore'
import { DebugReadouts } from './DebugReadouts'
import { downloadRecording, startLandmarkRecording, type LandmarkRecording } from './landmarkRecorder'
import { LandmarkSkeleton } from './LandmarkSkeleton'

/**
 * Press D to toggle. Controls stay registered while hidden so values persist.
 * While debug is on, R starts/stops recording the landmark stream to a JSON download.
 */
export function DebugOverlay() {
  const enabled = useDebugStore((s) => s.enabled)
  const [recording, setRecording] = useState(false)
  const stopRecording = useRef<(() => LandmarkRecording) | null>(null)
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
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      {enabled && (
        <>
          <LandmarkSkeleton />
          <DebugReadouts />
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 font-mono text-[11px] text-cyan-100">
            {recording ? <span className="text-red-400">● recording landmarks: R to stop and save</span> : 'R: record landmarks'}
          </p>
        </>
      )}
      <div className="pointer-events-auto">
        <Leva hidden={!enabled} titleBar={{ title: 'GlobalGram' }} />
      </div>
    </>
  )
}
