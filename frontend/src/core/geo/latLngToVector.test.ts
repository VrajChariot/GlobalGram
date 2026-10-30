import { describe, expect, it } from 'vitest'
import { latLngToVector, vectorToLatLng, writeLatLngToArray } from './latLngToVector'

describe('latLngToVector', () => {
  it('puts (0, 0) towards the camera on +Z', () => {
    const v = latLngToVector(0, 0)
    expect(v.x).toBeCloseTo(0)
    expect(v.y).toBeCloseTo(0)
    expect(v.z).toBeCloseTo(1)
  })

  it('puts the north pole on +Y and east on +X', () => {
    expect(latLngToVector(90, 123).y).toBeCloseTo(1)
    const east = latLngToVector(0, 90)
    expect(east.x).toBeCloseTo(1)
    expect(east.z).toBeCloseTo(0)
  })

  it('scales by radius', () => {
    const v = latLngToVector(30, 40, 2.5)
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(2.5)
  })

  it('round-trips through vectorToLatLng', () => {
    for (const [lat, lng] of [[51.5, -0.12], [-33.9, 151.2], [35.7, 139.7], [-0.5, -179.5]]) {
      const back = vectorToLatLng(latLngToVector(lat, lng, 1.7))
      expect(back.lat).toBeCloseTo(lat)
      expect(back.lng).toBeCloseTo(lng)
    }
  })

  it('writeLatLngToArray matches latLngToVector', () => {
    const out = new Float32Array(6)
    writeLatLngToArray(out, 3, 12, 34, 1.1)
    const v = latLngToVector(12, 34, 1.1)
    expect([out[3], out[4], out[5]].map((n) => +n.toFixed(5))).toEqual([v.x, v.y, v.z].map((n) => +n.toFixed(5)))
  })
})
