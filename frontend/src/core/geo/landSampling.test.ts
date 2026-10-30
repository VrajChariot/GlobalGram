import { describe, expect, it } from 'vitest'
import { isLand, landFraction, sampleLandPoints, type LandMask } from './landSampling'

function makeMask(width: number, height: number, land: (x: number, y: number) => boolean): LandMask {
  const data = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[y * width + x] = land(x, y) ? 255 : 0
  return { width, height, channels: 1, data }
}

describe('isLand', () => {
  it('maps lat/lng to the equirectangular pixel', () => {
    // Only the top-left pixel is land: lat 90..45, lng -180..-90.
    const mask = makeMask(4, 4, (x, y) => x === 0 && y === 0)
    expect(isLand(mask, 80, -170)).toBe(true)
    expect(isLand(mask, 80, 10)).toBe(false)
    expect(isLand(mask, -80, -170)).toBe(false)
  })

  it('clamps the poles and antimeridian into range', () => {
    const mask = makeMask(4, 2, () => true)
    expect(isLand(mask, 90, 180)).toBe(true)
    expect(isLand(mask, -90, -180)).toBe(true)
  })
})

describe('landFraction', () => {
  it('is area-weighted: the northern hemisphere is half the sphere', () => {
    const mask = makeMask(64, 64, (_, y) => y < 32)
    expect(landFraction(mask)).toBeCloseTo(0.5, 2)
  })

  it('weights polar rows less than equatorial ones', () => {
    const polarCap = makeMask(64, 64, (_, y) => y < 8)
    expect(landFraction(polarCap)).toBeLessThan(8 / 64)
  })
})

describe('sampleLandPoints', () => {
  it('returns roughly the target count on a partial mask', () => {
    const mask = makeMask(256, 128, (x, y) => (x + y) % 3 === 0)
    const points = sampleLandPoints(mask, 10_000)
    expect(points.length % 3).toBe(0)
    expect(points.length / 3).toBeGreaterThan(9_500)
    expect(points.length / 3).toBeLessThan(10_500)
  })

  it('only places points on land', () => {
    const mask = makeMask(64, 64, (_, y) => y < 32)
    const points = sampleLandPoints(mask, 2_000)
    for (let i = 1; i < points.length; i += 3) expect(points[i]).toBeGreaterThanOrEqual(0)
  })

  it('places points on the sphere surface at the given radius', () => {
    const mask = makeMask(8, 4, () => true)
    const points = sampleLandPoints(mask, 500, 1.5)
    for (let i = 0; i < points.length; i += 3) {
      expect(Math.hypot(points[i], points[i + 1], points[i + 2])).toBeCloseTo(1.5, 4)
    }
  })

  it('returns nothing for an all-sea mask', () => {
    expect(sampleLandPoints(makeMask(8, 4, () => false), 1_000).length).toBe(0)
  })
})
