import { describe, expect, it } from 'vitest'
import { gaussian, mulberry32, pickWeighted } from './random'

describe('mulberry32', () => {
  it('is deterministic per seed and in [0, 1)', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const x = a()
      expect(x).toBe(b())
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
})

describe('gaussian', () => {
  it('has roughly zero mean and unit variance', () => {
    const random = mulberry32(1)
    let sum = 0
    let sumSq = 0
    const n = 20_000
    for (let i = 0; i < n; i++) {
      const g = gaussian(random)
      sum += g
      sumSq += g * g
    }
    expect(sum / n).toBeCloseTo(0, 1)
    expect(sumSq / n).toBeCloseTo(1, 1)
  })
})

describe('pickWeighted', () => {
  it('picks in proportion to weight', () => {
    const random = mulberry32(3)
    const counts = { a: 0, b: 0 }
    for (let i = 0; i < 10_000; i++) counts[pickWeighted(random, ['a', 'b'] as const, (k) => (k === 'a' ? 3 : 1))]++
    expect(counts.a / counts.b).toBeGreaterThan(2.6)
    expect(counts.a / counts.b).toBeLessThan(3.4)
  })
})
