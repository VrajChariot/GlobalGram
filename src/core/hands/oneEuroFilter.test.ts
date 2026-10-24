import { describe, expect, it } from 'vitest'
import { mulberry32, gaussian } from '../math/random'
import type { TrackedHand } from './HandFrame'
import { DEFAULT_ONE_EURO, FILTERED_LANDMARKS, HandLandmarkFilter, OneEuroFilter } from './oneEuroFilter'

const DT = 1 / 30

function stdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
}

describe('OneEuroFilter', () => {
  it('passes the first sample through', () => {
    expect(new OneEuroFilter().filter(42, 0, DEFAULT_ONE_EURO)).toBe(42)
  })

  it('holds a constant signal exactly', () => {
    const f = new OneEuroFilter()
    for (let i = 0; i < 30; i++) expect(f.filter(5, i * DT, DEFAULT_ONE_EURO)).toBe(5)
  })

  it('suppresses jitter on a still hand (≈2px noise at 30 fps)', () => {
    const random = mulberry32(1)
    const f = new OneEuroFilter()
    const raw: number[] = []
    const out: number[] = []
    for (let i = 0; i < 300; i++) {
      const sample = 640 + gaussian(random) * 2
      raw.push(sample)
      out.push(f.filter(sample, i * DT, DEFAULT_ONE_EURO))
    }
    expect(stdDev(out.slice(30))).toBeLessThan(stdDev(raw.slice(30)) * 0.4)
  })

  it('keeps up with fast motion thanks to beta', () => {
    // 1000 px/s sweep: the speed term should open the cutoff so lag stays small.
    const fast = new OneEuroFilter()
    const still = new OneEuroFilter()
    const noBeta = { ...DEFAULT_ONE_EURO, beta: 0 }
    let lagFast = 0
    let lagNoBeta = 0
    for (let i = 0; i < 30; i++) {
      const x = i * DT * 1000
      lagFast = x - fast.filter(x, i * DT, DEFAULT_ONE_EURO)
      lagNoBeta = x - still.filter(x, i * DT, noBeta)
    }
    expect(lagFast).toBeLessThan(lagNoBeta / 4)
    expect(lagFast).toBeLessThan(40)
  })

  it('ignores repeated or out-of-order timestamps', () => {
    const f = new OneEuroFilter()
    f.filter(0, 1, DEFAULT_ONE_EURO)
    expect(f.filter(100, 1, DEFAULT_ONE_EURO)).toBe(0)
    expect(f.filter(100, 0.5, DEFAULT_ONE_EURO)).toBe(0)
  })
})

describe('HandLandmarkFilter', () => {
  const hand = (x: number): TrackedHand => ({
    landmarks: Array.from({ length: 21 }, (_, i) => ({ x: x + i * 0.001, y: 0.5, z: 0 })),
    handedness: 'Right',
    score: 0.9,
  })

  it('filters only the interaction landmarks', () => {
    const filter = new HandLandmarkFilter()
    filter.apply(hand(0.5), 'R', 0, DEFAULT_ONE_EURO, 1280, 720)
    const out = filter.apply(hand(0.6), 'R', DT, DEFAULT_ONE_EURO, 1280, 720)
    const moved = hand(0.6)
    for (let i = 0; i < 21; i++) {
      if ((FILTERED_LANDMARKS as readonly number[]).includes(i)) expect(out.landmarks[i].x).toBeLessThan(moved.landmarks[i].x)
      else expect(out.landmarks[i].x).toBe(moved.landmarks[i].x)
    }
  })

  it('keeps hands independent and resets dropped ones', () => {
    const filter = new HandLandmarkFilter()
    filter.apply(hand(0.2), 'L', 0, DEFAULT_ONE_EURO, 1280, 720)
    filter.apply(hand(0.8), 'R', 0, DEFAULT_ONE_EURO, 1280, 720)
    expect(filter.apply(hand(0.2), 'L', DT, DEFAULT_ONE_EURO, 1280, 720).landmarks[0].x).toBeCloseTo(0.2)
    filter.retain(['R'])
    // A fresh filter passes its first sample straight through.
    expect(filter.apply(hand(0.9), 'L', 2 * DT, DEFAULT_ONE_EURO, 1280, 720).landmarks[0].x).toBeCloseTo(0.9)
  })
})
