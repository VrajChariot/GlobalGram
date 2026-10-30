import { describe, expect, it } from 'vitest'
import { bobOffset, IDLE_BOB_AMPLITUDE, IDLE_DELAY_MS, idleWeight } from './idleMotion'

describe('idleWeight', () => {
  it('is 0 until 2 s after the last input', () => {
    expect(idleWeight(0)).toBe(0)
    expect(idleWeight(IDLE_DELAY_MS)).toBe(0)
  })

  it('eases in over the next second, then holds at 1', () => {
    const half = idleWeight(IDLE_DELAY_MS + 500)
    expect(half).toBeCloseTo(0.5)
    expect(idleWeight(IDLE_DELAY_MS + 250)).toBeLessThan(0.25)
    expect(idleWeight(IDLE_DELAY_MS + 1000)).toBe(1)
    expect(idleWeight(60_000)).toBe(1)
  })
})

describe('bobOffset', () => {
  it('swings ±0.02 over a 6 s period', () => {
    expect(bobOffset(0)).toBeCloseTo(0)
    expect(bobOffset(1.5)).toBeCloseTo(IDLE_BOB_AMPLITUDE)
    expect(bobOffset(4.5)).toBeCloseTo(-IDLE_BOB_AMPLITUDE)
    expect(bobOffset(6)).toBeCloseTo(0)
  })
})
