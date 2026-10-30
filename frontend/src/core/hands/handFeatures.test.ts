import { describe, expect, it } from 'vitest'
import { LANDMARK, mirrorHand, type Landmark, type TrackedHand } from './HandFrame'
import { computeHandFeatures, cursorPoint, pinchDistance, velocityBetween } from './handFeatures'

/**
 * A synthetic upright hand: wrist at (0.5, 0.8), palm length 0.1 (wrist → middle
 * MCP), fingertips at `reach` palm lengths. Aspect 1 keeps the maths simple.
 */
function makeHand({ reach = 1.9, pinchGap = 0.5 } = {}): TrackedHand {
  const landmarks: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.8, z: 0 }))
  const at = (dx: number, dy: number) => ({ x: 0.5 + dx * 0.1, y: 0.8 - dy * 0.1, z: 0 })
  landmarks[LANDMARK.MIDDLE_MCP] = at(0, 1)
  landmarks[LANDMARK.INDEX_MCP] = at(-0.25, 0.95)
  // Index tip straight up; thumb tip `pinchGap` palm lengths to its left.
  landmarks[LANDMARK.INDEX_TIP] = at(0, reach)
  landmarks[LANDMARK.THUMB_TIP] = at(-pinchGap, reach)
  landmarks[LANDMARK.MIDDLE_TIP] = at(0.1, reach)
  landmarks[LANDMARK.RING_TIP] = at(0.2, reach)
  landmarks[LANDMARK.PINKY_TIP] = at(0.3, reach)
  return { landmarks, handedness: 'Right', score: 0.95 }
}

describe('computeHandFeatures', () => {
  it('normalises pinch distance by palm length', () => {
    expect(computeHandFeatures(makeHand({ pinchGap: 0.5 }), 1).pinchDist).toBeCloseTo(0.5)
    expect(computeHandFeatures(makeHand({ pinchGap: 0.1 }), 1).pinchDist).toBeCloseTo(0.1)
  })

  it('is scale invariant: a hand twice as close gives the same features', () => {
    const near = makeHand({ pinchGap: 0.3 })
    near.landmarks = near.landmarks.map((l) => ({ x: 0.5 + (l.x - 0.5) * 2, y: 0.8 + (l.y - 0.8) * 2, z: 0 }))
    expect(computeHandFeatures(near, 1).pinchDist).toBeCloseTo(0.3)
  })

  it('maps openness from fist (0) to flat hand (1)', () => {
    expect(computeHandFeatures(makeHand({ reach: 2.4, pinchGap: 0.05 }), 1).openness).toBe(1)
    expect(computeHandFeatures(makeHand({ reach: 0.8, pinchGap: 0.05 }), 1).openness).toBe(0)
    const mid = computeHandFeatures(makeHand({ reach: 1.3, pinchGap: 0.05 }), 1).openness
    expect(mid).toBeGreaterThan(0.3)
    expect(mid).toBeLessThan(0.8)
  })

  it('pinchDistance matches the feature', () => {
    const hand = makeHand({ pinchGap: 0.3 })
    expect(pinchDistance(hand, 1)).toBeCloseTo(computeHandFeatures(hand, 1).pinchDist)
  })

  it('corrects for the video aspect ratio', () => {
    // Same gap along x reads larger once x is scaled to pixel proportions.
    const hand = makeHand({ pinchGap: 0.2 })
    expect(computeHandFeatures(hand, 16 / 9).pinchDist).toBeGreaterThan(computeHandFeatures(hand, 1).pinchDist)
  })
})

describe('cursorPoint', () => {
  it('uses the pinch midpoint while pinching, else the index tip', () => {
    const f = computeHandFeatures(makeHand({ pinchGap: 0.2 }), 1)
    expect(cursorPoint(f, false)).toEqual(f.indexTip)
    expect(cursorPoint(f, true).x).toBeCloseTo(f.indexTip.x - 0.01)
  })
})

describe('velocityBetween', () => {
  it('divides displacement by time', () => {
    expect(velocityBetween({ x: 0, y: 0 }, { x: 3, y: -6 }, 0.5)).toEqual({ x: 6, y: -12 })
    expect(velocityBetween({ x: 0, y: 0 }, { x: 3, y: 3 }, 0)).toEqual({ x: 0, y: 0 })
  })
})

describe('mirrorHand', () => {
  it('flips x and the handedness label', () => {
    const m = mirrorHand(makeHand())
    expect(m.landmarks[LANDMARK.WRIST].x).toBeCloseTo(0.5)
    expect(m.landmarks[LANDMARK.PINKY_TIP].x).toBeCloseTo(1 - (0.5 + 0.03))
    expect(m.handedness).toBe('Left')
  })
})
