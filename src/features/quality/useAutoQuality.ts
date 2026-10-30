import { useEffect } from 'react'
import { useHandStore } from '../../store/handStore'
import { useQualityStore } from '../../store/qualityStore'

const CHECK_MS = 2000
/** Tracker results needed before judging the tracker. */
const MIN_RESULTS = 15
const RESULT_WINDOW = 60
const MAX_MEDIAN_INFERENCE_MS = 90
const MIN_TRACKER_FPS = 12
/** Page fps below this for this many checks in a row also drops the tier. */
const MIN_PAGE_FPS = 40
const SLOW_PAGE_CHECKS = 3

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Drops to the 'low' tier once, never back, when the tracker or the page is slow.
 * `?quality=low|high` forces a tier and skips detection.
 */
export function useAutoQuality(): void {
  useEffect(() => {
    const { setTier } = useQualityStore.getState()
    const forced = new URLSearchParams(window.location.search).get('quality')
    if (forced === 'low' || forced === 'high') {
      setTier(forced)
      return
    }

    const inference: number[] = []
    const stopStats = useHandStore.subscribe((hands, previous) => {
      if (hands.stats === previous.stats || hands.status !== 'ready') return
      inference.push(hands.stats.inferenceMs)
      if (inference.length > RESULT_WINDOW) inference.shift()
    })

    let frames = 0
    let frame = requestAnimationFrame(function count() {
      frames++
      frame = requestAnimationFrame(count)
    })

    let slowPageChecks = 0
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      const pageFps = (frames * 1000) / (now - last)
      frames = 0
      last = now
      if (document.hidden) return

      const trackerSlow =
        inference.length >= MIN_RESULTS &&
        (median(inference) > MAX_MEDIAN_INFERENCE_MS || useHandStore.getState().stats.fps < MIN_TRACKER_FPS)
      slowPageChecks = pageFps < MIN_PAGE_FPS ? slowPageChecks + 1 : 0
      if (trackerSlow || slowPageChecks >= SLOW_PAGE_CHECKS) {
        setTier('low')
        clearInterval(timer)
        stopStats()
        cancelAnimationFrame(frame)
      }
    }, CHECK_MS)

    return () => {
      clearInterval(timer)
      stopStats()
      cancelAnimationFrame(frame)
    }
  }, [])
}
