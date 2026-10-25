/**
 * useFrame priorities, lowest first. All are ≤ 0: a positive priority would
 * stop R3F's automatic render, which the effect composer already owns.
 */
export const FRAME_ORDER = {
  idleMotion: -50,
  globeTransform: -40,
  clusters: -30,
  screenCache: -20,
  picking: -10,
} as const
