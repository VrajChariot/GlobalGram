/** Globe orientation in radians: yaw spins about the pole, pitch tilts towards the viewer. */
export type Orientation = { yaw: number; pitch: number }

export const ROTATE_RAD_PER_SCREEN_WIDTH = 3
export const MAX_PITCH = (60 * Math.PI) / 180
export const MIN_DISTANCE = 1.6
export const MAX_DISTANCE = 4.0

export function clampPitch(pitch: number): number {
  return Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch))
}

export function clampDistance(distance: number): number {
  return Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, distance))
}

/**
 * Applies a drag measured in screen widths (both axes, so rotation speed is
 * isotropic). Dragging right spins the surface right; dragging down tilts it down.
 */
export function applyDrag(orientation: Orientation, dxScreens: number, dyScreens: number): Orientation {
  return {
    yaw: orientation.yaw + dxScreens * ROTATE_RAD_PER_SCREEN_WIDTH,
    pitch: clampPitch(orientation.pitch + dyScreens * ROTATE_RAD_PER_SCREEN_WIDTH),
  }
}

/** Multiplicative zoom so equal gestures feel equal at any distance. */
export function zoomByFactor(distance: number, factor: number): number {
  return clampDistance(distance * factor)
}

/** Wraps an angle into (−π, π]. */
export function wrapAngle(angle: number): number {
  const wrapped = (angle + Math.PI) % (2 * Math.PI)
  return (wrapped <= 0 ? wrapped + 2 * Math.PI : wrapped) - Math.PI
}

/**
 * The orientation that brings (lat, lng) to the front of the globe, taking
 * the shortest way round from the current yaw.
 */
export function orientationFacing(lat: number, lng: number, currentYaw: number): Orientation {
  const yaw = (-lng * Math.PI) / 180
  return { yaw: currentYaw + wrapAngle(yaw - currentYaw), pitch: clampPitch((lat * Math.PI) / 180) }
}
