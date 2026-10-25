import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { GlobeEvent } from '../../core/events/GlobeEvent'
import { relativeTime } from '../../core/events/relativeTime'
import { visualConfig } from '../../shared/config/visualConfig'
import { GlassPanel } from '../../shared/ui/GlassPanel'
import { useEventStore } from '../../store/eventStore'
import { useSelectionStore } from '../../store/selectionStore'
import { LeaderLine, type LeaderLineHandle } from './LeaderLine'
import { TypingText } from './TypingText'
import { usePanelAnchor, type PanelAnchor } from './usePanelAnchor'

type Side = 'left' | 'right'

/** The panel moves to the other side only once the point is well past centre (hysteresis). */
const FLIP_TO_LEFT = 0.62
const FLIP_TO_RIGHT = 0.38
const OPEN_MS = 250
const CLOSE_MS = 180
/** Content sections fade in one after another once the card has opened (ms). */
const STAGGER_MS = [120, 170, 220, 270]

/**
 * Glass card for the selected event, on the side of the screen with more
 * room (the selected point is eased centre-left, so normally the right), with
 * a leader line to the point. Scales out from the point when it opens.
 */
export function InfoPanel({ onClose }: { onClose: () => void }) {
  const selectedId = useSelectionStore((s) => s.selectedId)
  const events = useEventStore((s) => s.events)
  const selected = useMemo(() => events.find((e) => e.id === selectedId) ?? null, [events, selectedId])
  // The last shown event stays mounted while it animates closed.
  const [closing, setClosing] = useState<GlobeEvent | null>(null)
  const [previous, setPrevious] = useState<GlobeEvent | null>(selected)
  if (selected !== previous) {
    setPrevious(selected)
    setClosing(selected ? null : previous)
  }

  if (selected) return <OpenPanel key={selected.id} event={selected} onClose={onClose} />
  if (closing) return <OpenPanel key={closing.id} event={closing} onClose={onClose} closing onClosed={() => setClosing(null)} />
  return null
}

type OpenPanelProps = {
  event: GlobeEvent
  onClose: () => void
  /** Animate back into the point, then call onClosed. */
  closing?: boolean
  onClosed?: () => void
}

function OpenPanel({ event, onClose, closing = false, onClosed }: OpenPanelProps) {
  const [side, setSide] = useState<Side>('right')
  const [now] = useState(() => Date.now())
  const panel = useRef<HTMLDivElement>(null)
  const leader = useRef<LeaderLineHandle>(null)
  const opened = useRef(false)

  const closed = useRef(onClosed)
  useEffect(() => {
    closed.current = onClosed
  })

  useEffect(() => {
    const el = panel.current
    if (!closing || !el) return
    const animation = el.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.1)', opacity: 0 },
      ],
      { duration: CLOSE_MS, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'both' },
    )
    animation.onfinish = () => closed.current?.()
    return () => animation.cancel()
  }, [closing])

  usePanelAnchor(event, (anchor: PanelAnchor) => {
    const el = panel.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (!opened.current && anchor.visible && !closing) {
      // Scale out from the point itself.
      opened.current = true
      el.style.transformOrigin = `${anchor.x - rect.left}px ${anchor.y - rect.top}px`
      el.animate(
        [
          { transform: 'scale(0.1)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        { duration: OPEN_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' },
      )
    }
    leader.current?.update(anchor, rect)
    if (anchor.visible && !closing) {
      const share = anchor.x / window.innerWidth
      if (side === 'right' && share > FLIP_TO_LEFT) setSide('left')
      else if (side === 'left' && share < FLIP_TO_RIGHT) setSide('right')
    }
  })

  useLayoutEffect(() => {
    // Until the point has been seen on screen, keep the panel hidden rather than popping in.
    if (panel.current && !opened.current) panel.current.style.opacity = '0'
  }, [])

  const colour = visualConfig.eventColors[event.category]

  return (
    <>
      <LeaderLine ref={leader} />
      <div className={`${closing ? 'pointer-events-none' : 'pointer-events-auto'} absolute top-1/2 w-[22rem] max-w-[calc(100vw-2rem)] -translate-y-1/2 ${side === 'right' ? 'right-[5vw]' : 'left-[5vw]'}`}>
        <GlassPanel ref={panel} className="max-h-[75vh] overflow-y-auto p-5 font-mono text-cyan-50">
          <div className="flex items-start justify-between gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] tracking-[0.15em] uppercase"
              style={{ borderColor: `${colour}88`, color: colour }}
            >
              <span className="size-1.5 rounded-full" style={{ background: colour }} />
              {event.category}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mt-1 -mr-1 rounded px-1.5 text-lg leading-none text-cyan-200/70 hover:bg-cyan-300/10 hover:text-cyan-50"
            >
              ×
            </button>
          </div>

          <h2 className="mt-3 text-base leading-snug font-semibold text-white">
            <TypingText text={event.title} />
          </h2>
          <p className="mt-1.5 animate-[panel-in_300ms_ease-out_both] text-[11px] tracking-wide text-cyan-200/70" style={{ animationDelay: `${STAGGER_MS[0]}ms` }}>
            {relativeTime(event.timestamp, now)} · {formatLatLng(event.lat, event.lng)}
          </p>

          <div
            className="relative mt-4 aspect-video animate-[panel-in_300ms_ease-out_both] overflow-hidden rounded border border-[#3FE0FF]/25"
            style={{ animationDelay: `${STAGGER_MS[1]}ms` }}
          >
            {event.imageUrl ? (
              <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(rgba(63,224,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(63,224,255,0.07)_1px,transparent_1px)] bg-[size:16px_16px] text-[10px] tracking-[0.2em] text-cyan-200/50 uppercase">
                No imagery
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1/4 animate-[scan-sweep_2.4s_linear_infinite] bg-gradient-to-b from-transparent via-[#3FE0FF]/15 to-transparent"
                />
              </div>
            )}
          </div>

          {event.summary && (
            <p className="mt-4 animate-[panel-in_300ms_ease-out_both] text-[13px] leading-relaxed text-cyan-50/90" style={{ animationDelay: `${STAGGER_MS[2]}ms` }}>
              {event.summary}
            </p>
          )}

          <div className="mt-4 flex animate-[panel-in_300ms_ease-out_both] items-center justify-between text-[11px]" style={{ animationDelay: `${STAGGER_MS[3]}ms` }}>
            <Importance value={event.importance} />
            {event.sourceUrl && (
              <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="text-[#3FE0FF] underline-offset-4 hover:underline">
                Source ↗
              </a>
            )}
          </div>
        </GlassPanel>
      </div>
    </>
  )
}

/** Five-segment importance meter. */
function Importance({ value }: { value: number }) {
  const lit = Math.max(1, Math.round(value * 5))
  return (
    <span className="flex items-center gap-2 text-cyan-200/60">
      importance
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`h-2.5 w-1.5 rounded-[1px] ${i < lit ? 'bg-[#3FE0FF]' : 'bg-cyan-200/15'}`} />
        ))}
      </span>
    </span>
  )
}

function formatLatLng(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`
}
