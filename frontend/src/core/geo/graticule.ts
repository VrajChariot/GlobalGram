import { writeLatLngToArray } from './latLngToVector'

/**
 * Line-segment pairs (xyz, xyz) for parallels and meridians every `stepDeg`.
 * The poles are left out as parallels since they degenerate to points.
 */
export function buildGraticule(stepDeg: number, radius = 1, segmentsPerCircle = 128): Float32Array {
  const parallels: number[] = []
  for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) parallels.push(lat)
  const meridians: number[] = []
  for (let lng = -180; lng < 180; lng += stepDeg) meridians.push(lng)

  const meridianSegments = segmentsPerCircle / 2
  const segmentCount = parallels.length * segmentsPerCircle + meridians.length * meridianSegments
  const out = new Float32Array(segmentCount * 6)
  let o = 0

  for (const lat of parallels) {
    for (let i = 0; i < segmentsPerCircle; i++) {
      writeLatLngToArray(out, o, lat, -180 + (360 * i) / segmentsPerCircle, radius)
      writeLatLngToArray(out, o + 3, lat, -180 + (360 * (i + 1)) / segmentsPerCircle, radius)
      o += 6
    }
  }
  for (const lng of meridians) {
    for (let i = 0; i < meridianSegments; i++) {
      writeLatLngToArray(out, o, -90 + (180 * i) / meridianSegments, lng, radius)
      writeLatLngToArray(out, o + 3, -90 + (180 * (i + 1)) / meridianSegments, lng, radius)
      o += 6
    }
  }
  return out
}
