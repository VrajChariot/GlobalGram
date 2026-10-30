import { describe, expect, it } from 'vitest'
import { buildGraticule } from './graticule'

describe('buildGraticule', () => {
  it('builds 11 parallels and 24 meridians at 15°', () => {
    const segments = 32
    const lines = buildGraticule(15, 1, segments)
    expect(lines.length).toBe((11 * segments + 24 * (segments / 2)) * 6)
  })

  it('keeps every vertex on the sphere', () => {
    const lines = buildGraticule(30, 1.25, 16)
    for (let i = 0; i < lines.length; i += 3) {
      expect(Math.hypot(lines[i], lines[i + 1], lines[i + 2])).toBeCloseTo(1.25, 5)
    }
  })
})
