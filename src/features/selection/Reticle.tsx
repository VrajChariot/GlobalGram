import { useEffect, useRef } from 'react'
import { useGestureStore } from '../../store/gestureStore'
import { useHandStore } from '../../store/handStore'

/** Share of the remaining distance the reticle closes each frame. */
const EASE_PER_FRAME = 0.3

/**
 * Hand cursor. Eases towards the latest cursor every frame, so 30 Hz tracking
 * reads smoothly at 60 fps. Mouse users keep the OS pointer, so it only shows
 * for hands.
 */
export function Reticle() {
  const root = useRef<SVGSVGElement>(null)

  useEffect(() => {
    let frame = 0
    let x = NaN
    let y = NaN
    const update = () => {
      frame = requestAnimationFrame(update)
      const el = root.current
      if (!el) return
      const { cursor } = useGestureStore.getState()
      if (!cursor || cursor.source !== 'hand') {
        el.style.display = 'none'
        x = NaN
        return
      }
      if (Number.isNaN(x)) {
        x = cursor.x
        y = cursor.y
      } else {
        x += (cursor.x - x) * EASE_PER_FRAME
        y += (cursor.y - y) * EASE_PER_FRAME
      }
      el.style.display = 'block'
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      el.dataset.pinching = String(useHandStore.getState().primary?.pinching ?? false)
    }
    update()
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <svg
      ref={root}
      width={40}
      height={40}
      viewBox="-20 -20 40 40"
      className="group absolute top-0 left-0 -mt-5 -ml-5 hidden overflow-visible"
    >
      <circle r={14} fill="none" stroke="#E6FCFF" strokeOpacity={0.85} strokeWidth={1.5} className="transition-transform duration-150 group-data-[pinching=true]:scale-75" />
      <circle r={2.5} fill="#3FE0FF" />
    </svg>
  )
}
