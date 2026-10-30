import { addAfterEffect } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { visualConfig } from '../../shared/config/visualConfig'
import { placeLabel } from '../../shared/ui/eventText'
import { useEventStore } from '../../store/eventStore'
import { useSelectionStore } from '../../store/selectionStore'

/** Most cluster badges shown at once; clusters come most-important first. */
const BADGE_POOL = 48
/** Badges only on beams facing the viewer (cos ≈ 70°), so the limb doesn't fill with labels. */
const BADGE_MIN_FACING = 0.35
/** The hover label stays at least this far from the viewport's side edges, px. */
const LABEL_EDGE_PX = 8

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
  const labelKey = useRef('')
  const labelHalf = useRef(0)

  useEffect(
    () =>
      addAfterEffect(() => {
        const { clusters, screen, events } = useEventStore.getState()
        const { hoveredId, selectedId } = useSelectionStore.getState()
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
        // The info panel already shows the selected event's title.
        if (hoveredIndex < 0 || !screen.visible[hoveredIndex] || hoveredId === selectedId) {
          hide(label)
          return
        }
        const cluster = clusters[hoveredIndex]
        const event = events[cluster.representative]
        show(label, screen.tip[hoveredIndex * 2], screen.tip[hoveredIndex * 2 + 1])
        setText(hoverTitle.current, event.title)
        setText(hoverMeta.current, cluster.members.length > 1 ? `${cluster.members.length - 1} more nearby` : placeLabel(event))
        if (hoverDot.current) hoverDot.current.style.background = visualConfig.eventColors[event.category]
        // Keep the label on screen near the edges (it is centred on the beam tip).
        // Width is measured only when the text changes: reading it every frame forces a synchronous layout.
        if (labelKey.current !== event.id + cluster.members.length) {
          labelKey.current = event.id + cluster.members.length
          labelHalf.current = label.offsetWidth / 2 + LABEL_EDGE_PX
        }
        const half = labelHalf.current
        const x = Math.min(Math.max(screen.tip[hoveredIndex * 2], half), window.innerWidth - half)
        label.style.transform = `translate3d(${x.toFixed(1)}px, ${screen.tip[hoveredIndex * 2 + 1].toFixed(1)}px, 0)`
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
          className="absolute top-0 left-0 hidden -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-full border border-hairline bg-black/70 px-1.5 text-xs leading-5 font-semibold tabular-nums text-light"
        />
      ))}
      <div
        ref={hover}
        className="absolute top-0 left-0 hidden max-w-72 -translate-x-1/2 -translate-y-[calc(100%+16px)] rounded-lg border border-hairline bg-[rgb(4_16_24/0.88)] px-3 py-2 text-light"
      >
        <span className="flex items-start gap-2 text-sm leading-snug font-medium">
          <span ref={hoverDot} className="mt-1 size-2 shrink-0 rounded-full" />
          <span ref={hoverTitle} />
        </span>
        <span ref={hoverMeta} className="mt-0.5 block pl-4 text-xs text-haze" />
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
