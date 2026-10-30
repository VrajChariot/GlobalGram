import { useEffect, useRef, useState } from 'react'
import { EVENT_CATEGORIES } from '../../core/events/GlobeEvent'
import { gestureConfig } from '../../shared/config/gestureConfig'
import { visualConfig } from '../../shared/config/visualConfig'
import { CATEGORY_LABELS } from '../../shared/ui/eventText'
import { useCameraStore } from '../../store/cameraStore'

type Row = [action: string, result: string]

const MOUSE_ROWS: Row[] = [
  ['Drag', 'Turns the globe'],
  ['Scroll', 'Zooms'],
  ['Click', 'Opens an event, or zooms into a group'],
  ['Arrow keys', 'Turn the globe'],
  ['+ and −', 'Zoom'],
  ['Esc', 'Closes the event'],
  ['H', 'Shows this guide'],
]

const secondaryButton = 'h-10 rounded-lg border border-hairline px-5 text-sm font-medium text-light hover:bg-white/10'

/** The Gestures button and the modal guide it opens (also on H or ?). */
export function HelpSheet() {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const camera = useCameraStore((s) => s.status)
  const setCamera = useCameraStore((s) => s.setStatus)

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      // showModal focuses the footer buttons and scrolls to them on a short viewport; start at the top instead.
      el.focus({ preventScroll: true })
      el.scrollTop = 0
    } else if (!open && el.open) el.close()
  }, [open])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key.toLowerCase() === 'h' || e.key === '?') setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const pinch = gestureConfig.selection.mode === 'pinch'
  const handRows: Row[] = [
    ['Point with your index finger', 'The ring follows and locks onto the nearest beam'],
    pinch
      ? ['Pinch and release', 'Opens the event, or zooms into a group']
      : ['Hold the ring still on a beam', 'Opens the event, or zooms into a group'],
    ['Pinch and drag', 'Turns the globe; flick to let it coast'],
    ['Pinch with both hands, then pull apart', 'Zooms in; bring your hands together to zoom out'],
    ['Thumbs-up', 'Closes the event'],
    ['Swipe your open palm left or right', 'Next or previous story at a spot with several'],
  ]
  const cameraAction = camera === 'off' ? 'Turn on camera' : camera === 'error' ? 'Try the camera again' : null

  return (
    <>
      <button
        type="button"
        aria-keyshortcuts="h"
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute right-4 bottom-4 flex h-9 items-center gap-2 rounded-lg border border-hairline bg-[rgb(4_16_24/0.88)] px-3 text-sm font-medium text-light hover:bg-white/10"
      >
        Gestures
        <kbd className="text-xs text-haze">H</kbd>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="help-title"
        tabIndex={-1}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false)
        }}
        className="pointer-events-auto m-auto max-h-[85vh] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-hairline bg-[rgb(4_16_24/0.94)] p-6 text-light outline-none backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <h2 id="help-title" className="text-2xl font-semibold">
          How to steer
        </h2>

        <Section title="With your hands" rows={handRows} />
        <Section title="With a mouse or keyboard" rows={MOUSE_ROWS} />

        <h3 className="mt-6 text-base font-semibold">What the colours mean</h3>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {EVENT_CATEGORIES.map((c) => (
            <li key={c} className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: visualConfig.eventColors[c] }} />
              {CATEGORY_LABELS[c]}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-haze">Events are generated samples, not real news.</p>
          <div className="flex gap-3">
            {cameraAction && (
              <button
                type="button"
                onClick={() => {
                  setCamera('starting')
                  setOpen(false)
                }}
                className={secondaryButton}
              >
                {cameraAction}
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg bg-light px-5 text-sm font-semibold text-[#04101A]">
              Done
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <>
      <h3 className="mt-6 text-base font-semibold">{title}</h3>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-0.5 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr] sm:gap-y-2">
        {rows.map(([action, result]) => (
          <div key={action} className="contents">
            <dt className="font-medium">{action}</dt>
            <dd className="text-haze max-sm:mb-2">{result}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
