import { describe, expect, it } from 'vitest'
import { latLngToVector } from '../geo/latLngToVector'
import { applyDrag, MAX_DISTANCE, MAX_PITCH, MIN_DISTANCE, orientationFacing, wrapAngle, zoomByFactor } from './orbit'

describe('applyDrag', () => {
  it('rotates 3 rad per screen width', () => {
    expect(applyDrag({ yaw: 0, pitch: 0 }, 1, 0).yaw).toBeCloseTo(3)
    expect(applyDrag({ yaw: 1, pitch: 0 }, -0.5, 0).yaw).toBeCloseTo(-0.5)
  })

  it('maps vertical drag to pitch, clamped to ±60°', () => {
    expect(applyDrag({ yaw: 0, pitch: 0 }, 0, 0.1).pitch).toBeCloseTo(0.3)
    expect(applyDrag({ yaw: 0, pitch: 0 }, 0, 5).pitch).toBe(MAX_PITCH)
    expect(applyDrag({ yaw: 0, pitch: 0 }, 0, -5).pitch).toBe(-MAX_PITCH)
  })
})

describe('zoomByFactor', () => {
  it('scales and clamps to 1.6–4.0', () => {
    expect(zoomByFactor(2, 1.1)).toBeCloseTo(2.2)
    expect(zoomByFactor(2, 0.1)).toBe(MIN_DISTANCE)
    expect(zoomByFactor(2, 10)).toBe(MAX_DISTANCE)
  })
})

describe('wrapAngle', () => {
  it('wraps into (−π, π]', () => {
    expect(wrapAngle(0)).toBeCloseTo(0)
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI)
    expect(wrapAngle(-Math.PI / 2 - 4 * Math.PI)).toBeCloseTo(-Math.PI / 2)
  })
})

describe('orientationFacing', () => {
  /** Applies the globe group's Euler XYZ rotation (yaw about Y, then pitch about X). */
  function rotate(lat: number, lng: number, yaw: number, pitch: number) {
    const v = latLngToVector(lat, lng)
    const x = v.x * Math.cos(yaw) + v.z * Math.sin(yaw)
    const z1 = -v.x * Math.sin(yaw) + v.z * Math.cos(yaw)
    return { x, y: v.y * Math.cos(pitch) - z1 * Math.sin(pitch), z: v.y * Math.sin(pitch) + z1 * Math.cos(pitch) }
  }

  it('brings the point to face the camera (+Z)', () => {
    const { yaw, pitch } = orientationFacing(35, 139, 0)
    const p = rotate(35, 139, yaw, pitch)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
    expect(p.z).toBeCloseTo(1)
  })

  it('takes the shortest way round from the current yaw', () => {
    const { yaw } = orientationFacing(0, 170, 20 * Math.PI)
    expect(Math.abs(yaw - 20 * Math.PI)).toBeLessThanOrEqual(Math.PI)
  })

  it('clamps pitch for polar points', () => {
    expect(orientationFacing(85, 0, 0).pitch).toBe(MAX_PITCH)
  })
})
