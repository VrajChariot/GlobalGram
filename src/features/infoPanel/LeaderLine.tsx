import { useImperativeHandle, useRef, type Ref } from 'react'
import type { PanelAnchor } from './usePanelAnchor'

export type LeaderLineHandle = {
  /** Draws from the anchor to the panel's nearest side edge. */
  update: (anchor: PanelAnchor, panel: DOMRect) => void
}

/** Elbow inset from the panel edge, px. */
const ELBOW = 28
/** Keep the line's end this far from the panel's corners, px. */
const EDGE_MARGIN = 24

/** Full-screen SVG line from the selected point to the info panel, driven imperatively every frame. */
export function LeaderLine({ ref }: { ref: Ref<LeaderLineHandle> }) {
  const group = useRef<SVGGElement>(null)
  const line = useRef<SVGPolylineElement>(null)
  const dot = useRef<SVGCircleElement>(null)
  const ring = useRef<SVGCircleElement>(null)

  useImperativeHandle(ref, () => ({
    update(anchor, panel) {
      const g = group.current
      if (!g || !line.current || !dot.current || !ring.current) return
      g.style.opacity = anchor.visible ? '1' : '0'
      if (!anchor.visible) return
      const panelOnRight = panel.left + panel.width / 2 > anchor.x
      const edgeX = panelOnRight ? panel.left : panel.right
      const endY = Math.min(panel.bottom - EDGE_MARGIN, Math.max(panel.top + EDGE_MARGIN, anchor.y))
      const elbowX = edgeX + (panelOnRight ? -ELBOW : ELBOW)
      line.current.setAttribute('points', `${anchor.x},${anchor.y} ${elbowX},${endY} ${edgeX},${endY}`)
      for (const c of [dot.current, ring.current]) {
        c.setAttribute('cx', String(anchor.x))
        c.setAttribute('cy', String(anchor.y))
      }
    },
  }))

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <g ref={group} className="transition-opacity duration-200" style={{ opacity: 0 }}>
        <polyline ref={line} fill="none" stroke="#3FE0FF" strokeOpacity={0.9} strokeWidth={1.25} pathLength={1} className="animate-[leader-draw_350ms_ease-out_both]" />
        <circle ref={ring} r={7} fill="none" stroke="#E6FCFF" strokeOpacity={0.7} strokeWidth={1} />
        <circle ref={dot} r={2.5} fill="#E6FCFF" />
      </g>
    </svg>
  )
}
