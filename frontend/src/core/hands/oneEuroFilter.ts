import type { TrackedHand } from './HandFrame'
import { LANDMARK } from './HandFrame'

export type OneEuroParams = {
  /** Cutoff (Hz) at rest: lower = smoother when still. */
  minCutoff: number
  /** Cutoff increase per unit of speed: higher = less lag when moving. */
  beta: number
  /** Cutoff (Hz) for the speed estimate. */
  dCutoff: number
}

export const DEFAULT_ONE_EURO: OneEuroParams = { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 }

function smoothingFactor(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff)
  return 1 / (1 + tau / dt)
}

/** One Euro filter (Casiez et al. 2012) for one scalar signal. Time in seconds. */
export class OneEuroFilter {
  private value: number | null = null
  private speed = 0
  private time = 0

  filter(raw: number, time: number, params: OneEuroParams): number {
    if (this.value === null || time <= this.time) {
      if (this.value === null) {
        this.value = raw
        this.time = time
      }
      return this.value
    }
    const dt = time - this.time
    this.time = time

    const rawSpeed = (raw - this.value) / dt
    this.speed += smoothingFactor(params.dCutoff, dt) * (rawSpeed - this.speed)
    const cutoff = params.minCutoff + params.beta * Math.abs(this.speed)
    this.value += smoothingFactor(cutoff, dt) * (raw - this.value)
    return this.value
  }
}

/** Only these landmarks drive interaction, so only these are filtered. */
export const FILTERED_LANDMARKS = [
  LANDMARK.WRIST,
  LANDMARK.THUMB_TIP,
  LANDMARK.INDEX_MCP,
  LANDMARK.INDEX_TIP,
  LANDMARK.MIDDLE_MCP,
] as const

/**
 * Per-hand One Euro filtering of the interaction landmarks. Coordinates are
 * scaled to pixels before filtering (`scaleX`/`scaleY`: pixels per normalised
 * unit): the One Euro parameters, beta especially, are tuned for pixel-scale
 * speeds, not 0..1 coordinates. Pass the on-screen scale so the filter acts on
 * the jitter the user actually sees.
 */
export class HandLandmarkFilter {
  private readonly filters = new Map<string, OneEuroFilter[]>()

  apply(hand: TrackedHand, key: string, time: number, params: OneEuroParams, scaleX: number, scaleY: number): TrackedHand {
    let set = this.filters.get(key)
    if (!set) {
      set = FILTERED_LANDMARKS.flatMap(() => [new OneEuroFilter(), new OneEuroFilter(), new OneEuroFilter()])
      this.filters.set(key, set)
    }
    const landmarks = hand.landmarks.slice()
    FILTERED_LANDMARKS.forEach((index, i) => {
      const l = hand.landmarks[index]
      landmarks[index] = {
        x: set[i * 3].filter(l.x * scaleX, time, params) / scaleX,
        y: set[i * 3 + 1].filter(l.y * scaleY, time, params) / scaleY,
        z: set[i * 3 + 2].filter(l.z * scaleX, time, params) / scaleX,
      }
    })
    return { ...hand, landmarks }
  }

  /** Drops filters for hands no longer tracked, so a returning hand starts fresh. */
  retain(keys: readonly string[]): void {
    for (const key of this.filters.keys()) if (!keys.includes(key)) this.filters.delete(key)
  }
}
