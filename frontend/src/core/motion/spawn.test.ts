import { describe, expect, it } from 'vitest'
import { easeOutCubic, grownHeight, SPAWN_DURATION_S } from './spawn'

describe('spawn growth', () => {
  it('eases out from 0 to 1 and clamps', () => {
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875)
    expect(easeOutCubic(2)).toBe(1)
  })

  it('grows from → to over 600 ms, waiting before its start time', () => {
    expect(SPAWN_DURATION_S).toBe(0.6)
    expect(grownHeight(0, 0.2, 10, 9)).toBe(0)
    expect(grownHeight(0, 0.2, 10, 10.3)).toBeCloseTo(0.175)
    expect(grownHeight(0.1, 0.3, 10, 11)).toBeCloseTo(0.3)
  })
})
