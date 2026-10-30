import { useEffect, useState } from 'react'
import { RENDER_QUALITY } from '../shared/config/visualConfig'
import { useQualityStore } from '../store/qualityStore'

/** Device pixel ratio for the canvas: the screen's, capped by RENDER_QUALITY's ratio and pixel budget. */
function renderDpr(): number {
  const cssPixels = window.innerWidth * window.innerHeight
  const byBudget = Math.sqrt(RENDER_QUALITY.pixelBudget / Math.max(cssPixels, 1))
  return Math.max(1, Math.min(window.devicePixelRatio || 1, RENDER_QUALITY.maxDpr, byBudget))
}

/** Tracks renderDpr() across window resizes and moves between displays; the low tier renders at 1. */
export function useRenderDpr(): number {
  const low = useQualityStore((s) => s.tier === 'low')
  const [dpr, setDpr] = useState(renderDpr)
  useEffect(() => {
    const update = () => setDpr(renderDpr())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return low ? 1 : dpr
}
