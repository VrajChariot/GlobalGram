import { addAfterEffect } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { visualConfig } from '../../shared/config/visualConfig'
import { useEventStore } from '../../store/eventStore'
import { useSelectionStore } from '../../store/selectionStore'

/** Most cluster badges shown at once; clusters come most-important first. */
const BADGE_POOL = 48
/** Badges only on beams facing the viewer (cos ≈ 70°), so the limb doesn't fill with labels. */
const BADGE_MIN_FACING = 0.35

/**
 * DOM labels for the HUD layer: count badges on cluster tips and a title
 * label on the hovered beam. Positioned after every rendered frame straight
 * from the screen cache; React never re-renders for them.
 */
export function EventLabels() {
  const badges = useRef<(HTMLDivElement | null)[]>([])
  const hover = useRef<HTMLDivElement>(null)
  const hoverDot = useRef<HTMLSpanElement>(null)
  const hoverTitle = useRef<HTMLSpanElement>(null)
  const hoverMeta = useRef<HTMLSpanElement>(null)

  useEffect(
    () =>
      addAfterEffect(() => {
        const { clusters, screen, events } = useEventStore.getState()
        const { hoveredId } = useSelectionStore.getState()
        const count = Math.min(screen.count, clusters.length)

        let used = 0
        let hoveredIndex = -1
        for (let i = 0; i < count; i++) {
          if (events[clusters[i].representative].id === hoveredId) hoveredIndex = i
          const members = clusters[i].members.length
          if (members < 2 || !screen.visible[i] || screen.facing[i] < BADGE_MIN_FACING || used >= BADGE_POOL) continue
          const badge = badges.current[used++]
          if (badge) show(badge, screen.tip[i * 2], screen.tip[i * 2 + 1], String(members))
        }
        for (let j = used; j < BADGE_POOL; j++) hide(badges.current[j])

        const label = hover.current
        if (!label) return
        if (hoveredIndex < 0 || !screen.visible[hoveredIndex]) {
          hide(label)
          return
        }
        const cluster = clusters[hoveredIndex]
        const event = events[cluster.representative]
        show(label, screen.tip[hoveredIndex * 2], screen.tip[hoveredIndex * 2 + 1])
        setText(hoverTitle.current, event.title)
        setText(hoverMeta.current, cluster.members.length > 1 ? `+${cluster.members.length - 1} nearby · select to expand` : event.category)
        if (hoverDot.current) hoverDot.current.style.background = visualConfig.eventColors[event.category]
      }),
    [],
  )

  return (
    <>
      {Array.from({ length: BADGE_POOL }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            badges.current[i] = el
          }}
          className="absolute top-0 left-0 hidden -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-full border border-cyan-200/50 bg-black/55 px-1.5 font-mono text-[10px] leading-4 text-cyan-50"
        />
      ))}
      <div
        ref={hover}
        className="absolute top-0 left-0 hidden max-w-72 -translate-x-1/2 -translate-y-[calc(100%+16px)] rounded border border-cyan-200/40 bg-[rgba(10,30,40,0.6)] px-2.5 py-1.5 font-mono text-cyan-50 backdrop-blur-sm"
      >
        <span className="flex items-start gap-2 text-xs leading-snug">
          <span ref={hoverDot} className="mt-1 size-2 shrink-0 rounded-full" />
          <span ref={hoverTitle} />
        </span>
        <span ref={hoverMeta} className="mt-0.5 block pl-4 text-[10px] tracking-wide text-cyan-200/70 uppercase" />
      </div>
    </>
  )
}

function show(el: HTMLElement, x: number, y: number, text?: string): void {
  el.style.display = 'block'
  el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
  if (text !== undefined) setText(el, text)
}

function hide(el: HTMLElement | null | undefined): void {
  if (el && el.style.display !== 'none') el.style.display = 'none'
}

function setText(el: HTMLElement | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text
}
