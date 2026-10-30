/** Idle starts this long after the last input (with no hand in view). */
export const IDLE_DELAY_MS = 2000
export const IDLE_SPIN_RAD_PER_S = 0.05
export const IDLE_BOB_AMPLITUDE = 0.02
export const IDLE_BOB_PERIOD_S = 6
/** Idle motion eases in over this long, so it never starts with a jolt. */
const IDLE_FADE_MS = 1000

/** 0 while active, easing to 1 over a second once the idle delay has passed. */
export function idleWeight(msSinceInput: number): number {
  const t = Math.min(1, Math.max(0, (msSinceInput - IDLE_DELAY_MS) / IDLE_FADE_MS))
  return t * t * (3 - 2 * t)
}

/** Vertical bob of the globe at time t (s). */
export function bobOffset(timeS: number): number {
  return IDLE_BOB_AMPLITUDE * Math.sin((2 * Math.PI * timeS) / IDLE_BOB_PERIOD_S)
}
