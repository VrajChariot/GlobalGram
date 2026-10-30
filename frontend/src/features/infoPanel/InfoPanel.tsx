import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { GlobeEvent } from '../../core/events/GlobeEvent'
import { relativeTime } from '../../core/events/relativeTime'
import { visualConfig } from '../../shared/config/visualConfig'
import { CATEGORY_LABELS, importanceLabel, placeLabel } from '../../shared/ui/eventText'
import { prefersReducedMotion } from '../../shared/ui/motion'
import { GlassPanel } from '../../shared/ui/GlassPanel'
import { useEventStore } from '../../store/eventStore'
import { useSelectionStore } from '../../store/selectionStore'
import { stepStack } from '../selection/selectionActions'
import { LeaderLine, type LeaderLineHandle } from './LeaderLine'
import { usePanelAnchor, type PanelAnchor } from './usePanelAnchor'

type Side = 'left' | 'right'

/** The panel moves to the other side only once the point is well past centre (hysteresis). */
const FLIP_TO_LEFT = 0.62
const FLIP_TO_RIGHT = 0.38
const OPEN_MS = 250
const CLOSE_MS = 180

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
      { duration: prefersReducedMotion() ? 0 : CLOSE_MS, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'both' },
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
        { duration: prefersReducedMotion() ? 0 : OPEN_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' },
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
  const titleId = `event-${event.id}-title`
  const stack = useSelectionStore((s) => s.stackIds)
  const stackAt = stack.indexOf(event.id)

  return (
    <>
      <LeaderLine ref={leader} colour={colour} />
      <div
        className={`${closing ? 'pointer-events-none' : 'pointer-events-auto'} absolute inset-x-3 bottom-16 sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:w-[24rem] sm:-translate-y-1/2 ${side === 'right' ? 'sm:right-[5vw]' : 'sm:left-[5vw]'}`}
      >
        <GlassPanel ref={panel} className="max-h-[55vh] overflow-y-auto sm:max-h-[75vh]">
          <article aria-labelledby={titleId} className="border-l-[3px] py-5 pr-5 pl-[1.125rem] text-light" style={{ borderColor: colour }}>
            <div className="flex items-start gap-3">
              <p className="flex flex-1 flex-wrap gap-x-3 text-sm font-semibold">
                <span style={{ color: colour }}>{CATEGORY_LABELS[event.category]}</span>
                <span className="font-medium text-haze">{importanceLabel(event.importance)}</span>
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close event"
                className="-mt-2 -mr-2 grid size-10 shrink-0 place-items-center rounded-lg text-haze hover:bg-white/10 hover:text-light"
              >
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <line x1={3} y1={3} x2={13} y2={13} />
                  <line x1={13} y1={3} x2={3} y2={13} />
                </svg>
              </button>
            </div>

            <h2 id={titleId} className="mt-2 text-2xl leading-[1.2] font-semibold tracking-[-0.01em] text-balance">
              {event.title}
            </h2>
            <p className="mt-2 flex flex-wrap gap-x-2 text-sm">
              <span className="font-medium">{placeLabel(event)}</span>
              <span className="text-haze">{relativeTime(event.timestamp, now)}</span>
            </p>

            {stackAt >= 0 && stack.length > 1 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-haze">
                <span className="flex-1">
                  {stackAt + 1} of {stack.length} stories here
                </span>
                {([-1, 1] as const).map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => stepStack(step)}
                    aria-label={step === 1 ? 'Next story here' : 'Previous story here'}
                    className="grid size-10 place-items-center rounded-lg hover:bg-white/10 hover:text-light"
                  >
                    {step === 1 ? '›' : '‹'}
                  </button>
                ))}
              </div>
            )}

            {event.imageUrl && <img src={event.imageUrl} alt="" className="mt-4 aspect-video w-full rounded-lg object-cover" />}

            {event.summary && <p className="mt-4 text-base leading-[1.55] text-light/90">{event.summary}</p>}

            {event.sourceUrl && (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block text-sm font-medium text-beam underline decoration-beam/40 underline-offset-4 hover:decoration-beam"
              >
                Read the source
              </a>
            )}
          </article>
        </GlassPanel>
      </div>
    </>
  )
}
