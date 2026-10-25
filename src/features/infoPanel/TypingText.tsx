import { useEffect, useState } from 'react'

/** Per-character reveal speed, capped so long titles still finish quickly. */
const MS_PER_CHAR = 18
const MAX_DURATION_MS = 700

/** Reveals `text` character by character. Remount (key) to replay. */
export function TypingText({ text }: { text: string }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const step = Math.min(MS_PER_CHAR, MAX_DURATION_MS / Math.max(text.length, 1))
    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const count = Math.min(text.length, Math.floor((now - start) / step))
      setShown(count)
      if (count < text.length) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [text])

  return (
    <>
      <span>{text.slice(0, shown)}</span>
      {shown < text.length && <span className="text-[#3FE0FF]">▍</span>}
      {/* Reserve the full title's space so the panel doesn't grow while typing. */}
      <span className="invisible">{text.slice(shown)}</span>
    </>
  )
}
