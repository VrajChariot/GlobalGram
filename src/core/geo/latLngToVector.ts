export type Vec3 = { x: number; y: number; z: number }
export type LatLng = { lat: number; lng: number }

const DEG = Math.PI / 180

/**
 * Globe convention: +Y is the north pole, (0°, 0°) faces +Z (towards the
 * camera at rest) and east is +X, so the globe reads unmirrored from the front.
 */
export function latLngToVector(lat: number, lng: number, radius = 1): Vec3 {
  const phi = lat * DEG
  const lambda = lng * DEG
  const r = Math.cos(phi) * radius
  return { x: r * Math.sin(lambda), y: Math.sin(phi) * radius, z: r * Math.cos(lambda) }
}

/** Allocation-free variant for filling typed position buffers. */
export function writeLatLngToArray(
  out: Float32Array,
  offset: number,
  lat: number,
  lng: number,
  radius = 1,
): void {
  const phi = lat * DEG
  const lambda = lng * DEG
  const r = Math.cos(phi) * radius
  out[offset] = r * Math.sin(lambda)
  out[offset + 1] = Math.sin(phi) * radius
  out[offset + 2] = r * Math.cos(lambda)
}

export function vectorToLatLng({ x, y, z }: Vec3): LatLng {
  const length = Math.hypot(x, y, z)
  return { lat: Math.asin(y / length) / DEG, lng: Math.atan2(x, z) / DEG }
}
