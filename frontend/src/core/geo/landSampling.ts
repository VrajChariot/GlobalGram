/**
 * An equirectangular land mask: row 0 is lat +90, column 0 is lng −180.
 * `channels` is the pixel stride (4 for canvas ImageData); channel 0 is read.
 */
export type LandMask = {
  width: number
  height: number
  channels: number
  data: ArrayLike<number>
}

const LAND_THRESHOLD = 128
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const RAD = 180 / Math.PI

export function isLand(mask: LandMask, lat: number, lng: number): boolean {
  const u = (lng + 180) / 360
  const v = (90 - lat) / 180
  const x = Math.min(mask.width - 1, Math.max(0, Math.floor(u * mask.width)))
  const y = Math.min(mask.height - 1, Math.max(0, Math.floor(v * mask.height)))
  return mask.data[(y * mask.width + x) * mask.channels] >= LAND_THRESHOLD
}

/** Share of the sphere's surface area that is land (rows weighted by cos lat). */
export function landFraction(mask: LandMask): number {
  let land = 0
  let total = 0
  for (let y = 0; y < mask.height; y++) {
    const weight = Math.cos(((90 - ((y + 0.5) * 180) / mask.height) / RAD))
    let rowLand = 0
    for (let x = 0; x < mask.width; x++) {
      if (mask.data[(y * mask.width + x) * mask.channels] >= LAND_THRESHOLD) rowLand++
    }
    land += rowLand * weight
    total += mask.width * weight
  }
  return total > 0 ? land / total : 0
}

/**
 * Evenly spaced points on land: a Fibonacci lattice over the whole sphere,
 * sized so roughly `targetCount` points survive the land test. Returns xyz
 * triples in the latLngToVector convention.
 */
export function sampleLandPoints(mask: LandMask, targetCount: number, radius = 1): Float32Array {
  const fraction = landFraction(mask)
  if (fraction === 0 || targetCount <= 0) return new Float32Array(0)

  const latticeSize = Math.round(targetCount / fraction)
  const out: number[] = []
  for (let i = 0; i < latticeSize; i++) {
    const y = 1 - (2 * (i + 0.5)) / latticeSize
    const ring = Math.sqrt(1 - y * y)
    const theta = i * GOLDEN_ANGLE
    const x = Math.cos(theta) * ring
    const z = Math.sin(theta) * ring
    if (isLand(mask, Math.asin(y) * RAD, Math.atan2(x, z) * RAD)) {
      out.push(x * radius, y * radius, z * radius)
    }
  }
  return new Float32Array(out)
}
