/** 4×4 matrix in column-major order, as three.js Matrix4.elements. */
export type Mat4 = ArrayLike<number>
export type Vec3Like = ArrayLike<number>

/**
 * Projects a point through a model-view-projection matrix into CSS pixels
 * (origin top-left), writing x, y at out[offset]. Returns false behind the camera.
 */
export function projectToScreen(
  mvp: Mat4,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  out: Float32Array,
  offset: number,
): boolean {
  const w = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15]
  if (w <= 1e-6) return false
  const cx = mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12]
  const cy = mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13]
  out[offset] = (cx / w * 0.5 + 0.5) * width
  out[offset + 1] = (0.5 - (cy / w) * 0.5) * height
  return true
}

/**
 * Cosine between the globe's surface normal at a model-space point and the
 * direction to the camera: > 0 means the point faces the viewer.
 */
export function facing(model: Mat4, camera: Vec3Like, x: number, y: number, z: number): number {
  const px = model[0] * x + model[4] * y + model[8] * z + model[12]
  const py = model[1] * x + model[5] * y + model[9] * z + model[13]
  const pz = model[2] * x + model[6] * y + model[10] * z + model[14]
  const nx = px - model[12]
  const ny = py - model[13]
  const nz = pz - model[14]
  const vx = camera[0] - px
  const vy = camera[1] - py
  const vz = camera[2] - pz
  const lengths = Math.hypot(nx, ny, nz) * Math.hypot(vx, vy, vz)
  return lengths > 0 ? (nx * vx + ny * vy + nz * vz) / lengths : 0
}
