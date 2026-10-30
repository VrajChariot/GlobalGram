import { describe, expect, it } from 'vitest'
import { beamHeight, clusterBeamHeight } from './beamHeight'

describe('beamHeight', () => {
  it('is 0.03 + importance × 0.25', () => {
    expect(beamHeight(0)).toBeCloseTo(0.03)
    expect(beamHeight(1)).toBeCloseTo(0.28)
    expect(beamHeight(0.5)).toBeCloseTo(0.155)
  })

  it('clamps importance to 0..1', () => {
    expect(beamHeight(2)).toBeCloseTo(0.28)
    expect(beamHeight(-1)).toBeCloseTo(0.03)
  })
})

describe('clusterBeamHeight', () => {
  it('equals a plain beam for a single event', () => {
    expect(clusterBeamHeight(0.4, 1)).toBe(beamHeight(0.4))
  })

  it('is taller than its tallest member and grows with count, capped', () => {
    expect(clusterBeamHeight(0.4, 2)).toBeGreaterThan(beamHeight(0.4))
    expect(clusterBeamHeight(0.4, 16)).toBeGreaterThan(clusterBeamHeight(0.4, 4))
    expect(clusterBeamHeight(1, 10_000)).toBe(0.34)
  })
})

describe('custom height params', () => {
  const params = { base: 0.05, perImportance: 0.5, clusterGrowth: 0.3, clusterMax: 0.4 }

  it('uses the given base and importance scale', () => {
    expect(beamHeight(0, params)).toBeCloseTo(0.05)
    expect(beamHeight(1, params)).toBeCloseTo(0.55)
  })

  it('applies the given cluster growth and cap', () => {
    expect(clusterBeamHeight(0.2, 4, params)).toBeCloseTo(0.15 * (1 + 0.3 * 2) + 0.025)
    expect(clusterBeamHeight(1, 64, params)).toBe(0.4)
  })
})
