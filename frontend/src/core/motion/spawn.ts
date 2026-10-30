/** Beams grow from their previous height to the new one over this long. */
export const SPAWN_DURATION_S = 0.6

export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return 1 - (1 - c) ** 3
}

/** Height of a growing beam at `now`; mirrors the beam vertex shader. */
export function grownHeight(from: number, to: number, startS: number, nowS: number): number {
  return from + (to - from) * easeOutCubic((nowS - startS) / SPAWN_DURATION_S)
}
