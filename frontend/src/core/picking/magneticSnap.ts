/** Projected beams in CSS pixels: base and tip xy pairs per instance. */
export type ScreenSegments = {
  base: Float32Array
  tip: Float32Array
  /** 1 if front-facing and on screen (pickable). */
  visible: Uint8Array
  count: number
}

export const SNAP_RADIUS_PX = 48
/** A new target must be this much closer than the current one to take over. */
export const SWITCH_MARGIN_PX = 12

export function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function segmentDistance(s: ScreenSegments, i: number, x: number, y: number): number {
  return distanceToSegment(x, y, s.base[i * 2], s.base[i * 2 + 1], s.tip[i * 2], s.tip[i * 2 + 1])
}

/**
 * Sticky nearest-beam search. Returns the index to target, or −1. The current
 * target is kept unless it leaves the radius, stops being visible, or another
 * beam is closer by more than `switchMargin`.
 */
export function snapTarget(
  s: ScreenSegments,
  x: number,
  y: number,
  current: number,
  radius = SNAP_RADIUS_PX,
  switchMargin = SWITCH_MARGIN_PX,
): number {
  let best = -1
  let bestDistance = radius
  for (let i = 0; i < s.count; i++) {
    if (!s.visible[i]) continue
    const d = segmentDistance(s, i, x, y)
    if (d < bestDistance) {
      bestDistance = d
      best = i
    }
  }

  if (current >= 0 && current < s.count && s.visible[current] && current !== best) {
    const currentDistance = segmentDistance(s, current, x, y)
    if (currentDistance < radius && (best < 0 || currentDistance - bestDistance <= switchMargin)) return current
  }
  return best
}
