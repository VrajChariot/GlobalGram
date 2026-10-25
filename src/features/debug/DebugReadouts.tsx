import { useEffect, useRef } from 'react'
import { useGestureStore } from '../../store/gestureStore'
import { useHandStore } from '../../store/handStore'
import { useSelectionStore } from '../../store/selectionStore'

type Row = [label: string, read: () => string]

const ROWS: Row[] = [
  ['tracker', () => {
    const { status, delegate, error } = useHandStore.getState()
    return error ? `error: ${error.slice(0, 60)}` : delegate ? `${status} · ${delegate}` : status
  }],
  ['renderer', () => {
    const { renderer } = useHandStore.getState()
    // "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, …)" → "ANGLE Metal Renderer: Apple M2"
    return renderer?.match(/,\s*([^,]+),/)?.[1] ?? renderer ?? '—'
  }],
  ['tracking', () => {
    const { stats } = useHandStore.getState()
    return `${stats.fps} fps · ${stats.inferenceMs.toFixed(1)} ms infer · ${stats.latencyMs.toFixed(0)} ms latency`
  }],
  ['hands', () => String(useHandStore.getState().filtered.length)],
  ['gesture', () => useGestureStore.getState().phase],
  ['pinchDist', () => useHandStore.getState().primary?.features.pinchDist.toFixed(3) ?? '—'],
  ['pinching', () => {
    const p = useHandStore.getState().primary
    return p ? String(p.pinching) : '—'
  }],
  ['openness', () => useHandStore.getState().primary?.features.openness.toFixed(2) ?? '—'],
  ['cursor', () => {
    const p = useHandStore.getState().primary
    return p ? `${p.cursor.x.toFixed(0)}, ${p.cursor.y.toFixed(0)} · ${Math.hypot(p.velocity.x, p.velocity.y).toFixed(0)} px/s` : '—'
  }],
  ['hovered', () => useSelectionStore.getState().hoveredId ?? '—'],
]

/** Live pipeline readouts, refreshed every animation frame without React renders. */
export function DebugReadouts() {
  const values = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = requestAnimationFrame(update)
      ROWS.forEach(([, read], i) => {
        const el = values.current[i]
        const text = read()
        if (el && el.textContent !== text) el.textContent = text
      })
    }
    update()
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <dl className="absolute top-3 left-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded border border-cyan-300/30 bg-black/60 px-3 py-2 font-mono text-[11px] text-cyan-50">
      {ROWS.map(([label], i) => (
        <div key={label} className="contents">
          <dt className="text-cyan-300/70">{label}</dt>
          <dd
            ref={(el) => {
              values.current[i] = el
            }}
          />
        </div>
      ))}
    </dl>
  )
}
