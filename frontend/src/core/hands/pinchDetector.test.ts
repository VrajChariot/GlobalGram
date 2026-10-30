import { describe, expect, it } from 'vitest'
import { INITIAL_PINCH, pinchEndThreshold, pinchProgress, pinchStartThreshold, stepPinch, type PinchDetector } from './pinchDetector'

const FRAME = 80

function run(distances: number[], start: PinchDetector = INITIAL_PINCH, t0 = 0): { d: PinchDetector; states: boolean[] } {
  let d = start
  const states: boolean[] = []
  distances.forEach((x, i) => {
    d = stepPinch(d, x, t0 + i * FRAME)
    states.push(d.pinching)
  })
  return { d, states }
}

/** Rest at `level` for ~2 s so the detector learns it. */
function settled(level: number): PinchDetector {
  return run(Array(25).fill(level)).d
}

describe('open hand (rests ~0.6)', () => {
  it('starts below 0.25 and releases halfway back to rest (≈0.34 here, never above 0.40)', () => {
    const d = settled(0.6)
    expect(pinchStartThreshold(d)).toBe(0.25)
    const { states } = run([0.3, 0.24, 0.12, 0.3, 0.33, 0.36], d, 25 * FRAME)
    expect(states).toEqual([false, true, true, true, true, false])
  })

  it('keeps a noisy drag pinched', () => {
    const d = settled(0.6)
    const { states } = run([0.14, 0.18, 0.22, 0.16, 0.25, 0.2, 0.15], d, 25 * FRAME)
    expect(states.every(Boolean)).toBe(true)
  })
})

describe('curled fingers (rests ~0.27)', () => {
  it('does not mistake resting near 0.25 for a pinch', () => {
    const d = settled(0.27)
    const { states } = run([0.25, 0.24, 0.26, 0.23, 0.25, 0.24], d, 25 * FRAME)
    expect(states.some(Boolean)).toBe(false)
  })

  it('catches a shallow tap that only reopens to ~0.27', () => {
    // Shape of a real recorded tap: 0.27 → 0.16 → 0.27.
    const d = settled(0.27)
    const { states } = run([0.22, 0.19, 0.16, 0.16, 0.18, 0.27, 0.28], d, 25 * FRAME)
    expect(states).toEqual([false, true, true, true, true, false, false])
  })

  it('catches repeated taps', () => {
    let d = settled(0.3)
    let onsets = 0
    let t = 25 * FRAME
    for (let tap = 0; tap < 4; tap++) {
      for (const x of [0.3, 0.29, 0.19, 0.18, 0.28, 0.3, 0.31]) {
        const was = d.pinching
        d = stepPinch(d, x, (t += FRAME))
        if (d.pinching && !was) onsets++
      }
    }
    expect(onsets).toBe(4)
    expect(d.pinching).toBe(false)
  })
})

describe('thresholds', () => {
  it('never require reopening past 0.40', () => {
    const d = { ...settled(0.9), pinching: true, tightest: 0.05 }
    expect(pinchEndThreshold(d)).toBe(0.4)
  })

  it('always require some reopening', () => {
    const d: PinchDetector = { pinching: true, rest: 0.2, tightest: 0.15, lastTime: 0 }
    expect(pinchEndThreshold(d)).toBeCloseTo(0.21)
  })

  it('the first sample sets the resting distance', () => {
    expect(stepPinch(INITIAL_PINCH, 0.7, 0).rest).toBe(0.7)
  })
})

describe('pinchProgress', () => {
  it('fills from rest (0) to the start threshold (1)', () => {
    const d = settled(0.65) // start threshold 0.25
    expect(pinchProgress(d, 0.65)).toBeCloseTo(0)
    expect(pinchProgress(d, 0.45)).toBeCloseTo(0.5, 1)
    expect(pinchProgress(d, 0.2)).toBe(1)
    expect(pinchProgress(d, 0.9)).toBe(0)
  })

  it('is full while pinching', () => {
    expect(pinchProgress({ ...settled(0.65), pinching: true, tightest: 0.1 }, 0.3)).toBe(1)
  })
})
