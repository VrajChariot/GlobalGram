import { useEffect, useRef, type RefObject } from 'react'
import { releaseVelocity, trackVelocity, ZERO_VELOCITY } from '../../core/motion/inertia'
import { applyDrag, zoomByFactor } from '../../core/motion/orbit'
import { useGestureStore } from '../../store/gestureStore'
import { useHandStore } from '../../store/handStore'
import { useGlobeStore } from '../../store/globeStore'

/** One wheel notch (~100 deltaY) zooms by about 10%. */
const WHEEL_ZOOM_PER_DELTA = 0.001
/** Movement below this is a click, not a drag. */
const DRAG_THRESHOLD_PX = 4
/** One arrow-key press turns the globe this many screen widths (about 5°). */
const KEY_ROTATE_SCREENS = 0.03
/** One + press scales the camera distance by this; − divides by it. */
const KEY_ZOOM_IN = 0.9

type Press = {
  pointerId: number
  startX: number
  startY: number
  x: number
  y: number
  time: number
  dragging: boolean
}

export type MouseFallbackHandlers = {
  /** A click that never became a drag. */
  onTap?: () => void
  onEscape?: () => void
}

/**
 * Mouse/touch/keyboard stand-in for hand gestures: hover moves the cursor, drag
 * rotates with inertia, click taps, wheel zooms, Escape cancels. Arrow keys
 * turn the globe and + / − zoom it.
 */
export function useMouseFallback(targetRef: RefObject<HTMLElement | null>, handlers: MouseFallbackHandlers = {}): void {
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    const target = targetRef.current
    if (!target) return
    let press: Press | null = null
    const setCursor = useGestureStore.getState().setCursor
    // A tracked hand owns the cursor; the mouse only points when no hand is up.
    const handActive = () => useHandStore.getState().primary !== null

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || press) return
      target.setPointerCapture(e.pointerId)
      press = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, time: e.timeStamp, dragging: false }
      const store = useGlobeStore.getState()
      store.setVelocity(ZERO_VELOCITY)
      store.setLastInputAt(e.timeStamp)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!handActive()) setCursor({ x: e.clientX, y: e.clientY, source: 'mouse' })
      if (!press || e.pointerId !== press.pointerId) return
      const store = useGlobeStore.getState()
      if (!press.dragging) {
        if (Math.hypot(e.clientX - press.startX, e.clientY - press.startY) < DRAG_THRESHOLD_PX) return
        press.dragging = true
        store.setDragging(true)
      }

      const width = window.innerWidth
      const next = applyDrag({ yaw: store.yaw, pitch: store.pitch }, (e.clientX - press.x) / width, (e.clientY - press.y) / width)
      const dt = (e.timeStamp - press.time) / 1000
      store.setVelocity(trackVelocity(store.velocity, next.yaw - store.yaw, next.pitch - store.pitch, dt))
      store.setOrientation(next.yaw, next.pitch)
      store.setLastInputAt(e.timeStamp)
      press.x = e.clientX
      press.y = e.clientY
      press.time = e.timeStamp
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.pointerId) return
      const store = useGlobeStore.getState()
      if (press.dragging) {
        store.setVelocity(releaseVelocity(store.velocity, e.timeStamp - press.time))
        store.setDragging(false)
      } else if (e.type === 'pointerup') {
        latest.current.onTap?.()
      }
      store.setLastInputAt(e.timeStamp)
      press = null
    }

    const onPointerLeave = () => {
      if (!press && useGestureStore.getState().cursor?.source === 'mouse') setCursor(null)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const store = useGlobeStore.getState()
      store.setDistance(zoomByFactor(store.distance, Math.exp(e.deltaY * WHEEL_ZOOM_PER_DELTA)))
      store.setLastInputAt(e.timeStamp)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // An open dialog owns the keyboard: Escape closes it without clearing the selection.
      if (document.querySelector('dialog[open]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const store = useGlobeStore.getState()
      let dx = 0
      let dy = 0
      switch (e.key) {
        case 'Escape':
          latest.current.onEscape?.()
          return
        case 'ArrowLeft':
          dx = -KEY_ROTATE_SCREENS
          break
        case 'ArrowRight':
          dx = KEY_ROTATE_SCREENS
          break
        case 'ArrowUp':
          dy = -KEY_ROTATE_SCREENS
          break
        case 'ArrowDown':
          dy = KEY_ROTATE_SCREENS
          break
        case '+':
        case '=':
          store.setDistance(zoomByFactor(store.distance, KEY_ZOOM_IN))
          store.setLastInputAt(performance.now())
          return
        case '-':
        case '_':
          store.setDistance(zoomByFactor(store.distance, 1 / KEY_ZOOM_IN))
          store.setLastInputAt(performance.now())
          return
        default:
          return
      }
      e.preventDefault()
      const next = applyDrag({ yaw: store.yaw, pitch: store.pitch }, dx, dy)
      store.setVelocity(ZERO_VELOCITY)
      store.setOrientation(next.yaw, next.pitch)
      store.setLastInputAt(performance.now())
    }

    target.addEventListener('pointerdown', onPointerDown)
    target.addEventListener('pointermove', onPointerMove)
    target.addEventListener('pointerup', onPointerUp)
    target.addEventListener('pointercancel', onPointerUp)
    target.addEventListener('pointerleave', onPointerLeave)
    target.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      target.removeEventListener('pointerdown', onPointerDown)
      target.removeEventListener('pointermove', onPointerMove)
      target.removeEventListener('pointerup', onPointerUp)
      target.removeEventListener('pointercancel', onPointerUp)
      target.removeEventListener('pointerleave', onPointerLeave)
      target.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [targetRef])
}
