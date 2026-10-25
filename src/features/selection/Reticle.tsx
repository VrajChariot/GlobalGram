import { useEffect, useRef } from 'react'
import { gestureConfig } from '../../shared/config/gestureConfig'
import { useEventStore } from '../../store/eventStore'
import { useGestureStore } from '../../store/gestureStore'
import { useHandStore } from '../../store/handStore'
import { useSelectionStore } from '../../store/selectionStore'

/** Share of the remaining distance the reticle closes each frame. */
const EASE_PER_FRAME = 0.3
const RING_RADIUS = 14
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

type ReticleState = 'free' | 'locked'

/**
 * The cursor. Free: a ring easing after the hand. Locked: snapped onto the
 * target beam's pin with corner brackets. A progress arc fills as the fingers
 * close towards a pinch (or as a dwell runs). Mouse users keep the OS pointer,
 * so for them only the locked state shows.
 */
export function Reticle() {
  const root = useRef<SVGSVGElement>(null)
  const progressArc = useRef<SVGCircleElement>(null)

  useEffect(() => {
    let frame = 0
    let x = NaN
    let y = NaN
    let shownProgress = -1
    const update = () => {
      frame = requestAnimationFrame(update)
      const el = root.current
      if (!el) return
      const { cursor, phase } = useGestureStore.getState()
      const { hoveredIndex } = useSelectionStore.getState()
      const { screen } = useEventStore.getState()

      const locked = hoveredIndex >= 0 && hoveredIndex < screen.count && screen.visible[hoveredIndex] === 1
      const isHand = cursor?.source === 'hand'
      if (!cursor || (!isHand && !locked)) {
        el.style.display = 'none'
        x = NaN
        return
      }

      // Locked: home in on the target's pin. Free: follow the cursor.
      const targetX = locked ? screen.tip[hoveredIndex * 2] : cursor.x
      const targetY = locked ? screen.tip[hoveredIndex * 2 + 1] : cursor.y
      if (Number.isNaN(x)) {
        x = targetX
        y = targetY
      } else {
        x += (targetX - x) * EASE_PER_FRAME
        y += (targetY - y) * EASE_PER_FRAME
      }
      el.style.display = 'block'
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      const state: ReticleState = locked ? 'locked' : 'free'
      if (el.dataset.state !== state) el.dataset.state = state

      const progress = !isHand
        ? 0
        : gestureConfig.selection.mode === 'dwell'
          ? useSelectionStore.getState().dwellProgress
          : phase === 'RotateDrag' || phase === 'TwoHandZoom'
            ? 0
            : (useHandStore.getState().primary?.pinchProgress ?? 0)
      const rounded = Math.round(progress * 100) / 100
      if (rounded !== shownProgress && progressArc.current) {
        shownProgress = rounded
        progressArc.current.style.strokeDashoffset = String(RING_LENGTH * (1 - rounded))
      }
    }
    update()
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <svg
      ref={root}
      width={48}
      height={48}
      viewBox="-24 -24 48 48"
      data-state="free"
      className="group absolute top-0 left-0 -mt-6 -ml-6 hidden overflow-visible"
    >
      <g className="origin-center transition-transform duration-150 group-data-[state=locked]:scale-[0.8]">
        <circle r={RING_RADIUS} fill="none" stroke="#E6FCFF" strokeWidth={1.25} className="opacity-60 group-data-[state=locked]:opacity-100" />
        <circle
          ref={progressArc}
          r={RING_RADIUS}
          fill="none"
          stroke="#3FE0FF"
          strokeWidth={3}
          strokeLinecap="round"
          transform="rotate(-90)"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH}
        />
        {/* Corner brackets: only when locked. */}
        <g stroke="#E6FCFF" strokeWidth={1.5} fill="none" className="opacity-0 transition-opacity duration-150 group-data-[state=locked]:opacity-100">
          <path d="M -21 -14 V -21 H -14" />
          <path d="M 14 -21 H 21 V -14" />
          <path d="M 21 14 V 21 H 14" />
          <path d="M -14 21 H -21 V 14" />
        </g>
      </g>
      <circle r={2.25} fill="#3FE0FF" className="group-data-[state=locked]:fill-white" />
    </svg>
  )
}
