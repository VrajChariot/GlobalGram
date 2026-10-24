import { describe, expect, it } from 'vitest'
import { distanceToSegment, snapTarget, type ScreenSegments } from './magneticSnap'

/** Vertical beams 40px tall standing on the given base points. */
function beams(bases: [number, number][], visible = bases.map(() => 1)): ScreenSegments {
  return {
    base: new Float32Array(bases.flat()),
    tip: new Float32Array(bases.flatMap(([x, y]) => [x, y - 40])),
    visible: new Uint8Array(visible),
    count: bases.length,
  }
}

describe('distanceToSegment', () => {
  it('measures to the nearest point on the segment', () => {
    expect(distanceToSegment(5, 3, 0, 0, 10, 0)).toBe(3)
    expect(distanceToSegment(-4, 3, 0, 0, 10, 0)).toBe(5)
    expect(distanceToSegment(1, 1, 2, 2, 2, 2)).toBeCloseTo(Math.SQRT2)
  })
})

describe('snapTarget', () => {
  it('picks the nearest beam within the radius', () => {
    const s = beams([[100, 100], [200, 100]])
    expect(snapTarget(s, 110, 80, -1)).toBe(0)
    expect(snapTarget(s, 190, 100, -1)).toBe(1)
  })

  it('returns −1 beyond the 48px radius', () => {
    expect(snapTarget(beams([[100, 100]]), 160, 100, -1)).toBe(-1)
  })

  it('measures to the whole beam, not just its base', () => {
    expect(snapTarget(beams([[100, 100]]), 100, 30, -1)).toBe(0)
  })

  it('never targets invisible (back-facing) beams', () => {
    expect(snapTarget(beams([[100, 100]], [0]), 100, 100, -1)).toBe(-1)
    expect(snapTarget(beams([[100, 100], [130, 100]], [1, 0]), 128, 100, 1)).toBe(0)
  })

  it('keeps the current target unless another beats it by more than 12px', () => {
    const s = beams([[100, 100], [130, 100]])
    // Cursor at 120: current (0) is 20px away, other is 10px: only 10px better, so stick.
    expect(snapTarget(s, 120, 100, 0)).toBe(0)
    // Cursor at 126: current 26px, other 4px: 22px better, so switch.
    expect(snapTarget(s, 126, 100, 0)).toBe(1)
  })

  it('drops the current target once it leaves the radius', () => {
    const s = beams([[100, 100], [300, 100]])
    expect(snapTarget(s, 170, 100, 0)).toBe(-1)
  })
})
