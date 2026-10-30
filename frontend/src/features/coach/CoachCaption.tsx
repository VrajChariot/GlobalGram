import { useEffect, useState } from 'react'
import { gestureConfig } from '../../shared/config/gestureConfig'
import { useCameraStore } from '../../store/cameraStore'
import { useCoachStore } from '../../store/coachStore'
import { useEventStore } from '../../store/eventStore'
import { useGestureStore } from '../../store/gestureStore'
import { useHandStore } from '../../store/handStore'
import { useReplayStore } from '../../store/replayStore'
import { useSelectionStore } from '../../store/selectionStore'
import { coachMessage, type CoachMessage } from './coachMessage'

/** A tip must hold this long before it replaces what's shown, so flickering hovers don't flash captions. */
const TIP_SETTLE_MS = 250

/**
 * Broadcast-style subtitle that reports status and teaches the next gesture.
 * Polled every frame from the stores (like the reticle); React re-renders only when the message changes.
 */
export function CoachCaption() {
  const [shown, setShown] = useState<CoachMessage | null>(null)

  useEffect(() => {
    let frame = 0
    let current: CoachMessage | null = null
    // undefined: nothing waiting; null: waiting to clear the caption.
    let pending: CoachMessage | null | undefined
    let pendingSince = 0

    const update = (time: number) => {
      frame = requestAnimationFrame(update)
      const camera = useCameraStore.getState()
      const { primary } = useHandStore.getState()
      const { hoveredIndex, selectedId } = useSelectionStore.getState()
      const { clusters, status: events } = useEventStore.getState()
      const coach = useCoachStore.getState()
      if (primary !== null && !coach.learned.includes('hand')) coach.learn('hand')

      const candidate = coachMessage({
        camera: camera.status,
        cameraError: camera.error,
        tracker: useHandStore.getState().status,
        events,
        replaying: useReplayStore.getState().active,
        hand: primary !== null,
        phase: useGestureStore.getState().phase,
        hovered: hoveredIndex >= 0 && hoveredIndex < clusters.length ? { members: clusters[hoveredIndex].members.length } : null,
        selected: selectedId !== null,
        selectionMode: gestureConfig.selection.mode,
        learned: useCoachStore.getState().learned,
      })

      if (same(candidate, current)) {
        pending = undefined
        return
      }
      const immediate = candidate ? candidate.kind !== 'tip' : current !== null && current.kind !== 'tip'
      if (!immediate) {
        if (pending === undefined || !same(candidate, pending)) {
          pending = candidate
          pendingSince = time
        }
        if (time - pendingSince < TIP_SETTLE_MS) return
      }
      current = candidate
      pending = undefined
      setShown(candidate)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-4 top-4 flex justify-center sm:top-auto sm:bottom-14">
      {shown && (
        <p
          key={shown.text}
          className={`max-w-[36rem] animate-[caption-in_160ms_ease-out_both] text-center text-lg leading-[1.6] font-medium sm:text-xl ${shown.kind === 'error' ? 'text-alert' : 'text-light'}`}
        >
          <span className="box-decoration-clone bg-black/72 px-2 py-0.5">{shown.text}</span>
        </p>
      )}
    </div>
  )
}

function same(a: CoachMessage | null, b: CoachMessage | null): boolean {
  return a === b || (a !== null && b !== null && a.kind === b.kind && a.text === b.text)
}
