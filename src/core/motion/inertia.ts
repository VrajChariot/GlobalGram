import { clampPitch, type Orientation } from './orbit'

/** Angular velocity in rad/s. */
export type AngularVelocity = { yaw: number; pitch: number }

export const ZERO_VELOCITY: AngularVelocity = { yaw: 0, pitch: 0 }

/** Velocity is multiplied by this once per 60 Hz frame. */
export const DECAY_PER_FRAME = 0.92
const REFERENCE_FRAME_S = 1 / 60
/** Below this speed (rad/s) inertia snaps to rest. */
const REST_SPEED = 0.002
/** A pointer held still this long before release gets no fling. */
export const RELEASE_HOLD_MS = 80
/** Weight of the newest sample in the velocity moving average. */
const VELOCITY_SMOOTHING = 0.6

/** Frame-rate independent equivalent of `v *= 0.92` each 60 Hz frame. */
export function decay(v: number, dt: number, perFrame = DECAY_PER_FRAME): number {
  const next = v * Math.pow(perFrame, dt / REFERENCE_FRAME_S)
  return Math.abs(next) < REST_SPEED ? 0 : next
}

export function isAtRest(v: AngularVelocity): boolean {
  return v.yaw === 0 && v.pitch === 0
}

/** Advances a free-spinning globe by dt seconds. Hitting the pitch clamp kills pitch velocity. */
export function stepInertia(
  orientation: Orientation,
  velocity: AngularVelocity,
  dt: number,
): { orientation: Orientation; velocity: AngularVelocity } {
  const rawPitch = orientation.pitch + velocity.pitch * dt
  const pitch = clampPitch(rawPitch)
  return {
    orientation: { yaw: orientation.yaw + velocity.yaw * dt, pitch },
    velocity: {
      yaw: decay(velocity.yaw, dt),
      pitch: pitch === rawPitch ? decay(velocity.pitch, dt) : 0,
    },
  }
}

/** Smoothed velocity from one drag sample (radians moved over dt seconds). */
export function trackVelocity(
  previous: AngularVelocity,
  dYaw: number,
  dPitch: number,
  dt: number,
): AngularVelocity {
  if (dt <= 0) return previous
  const k = VELOCITY_SMOOTHING
  return {
    yaw: previous.yaw * (1 - k) + (dYaw / dt) * k,
    pitch: previous.pitch * (1 - k) + (dPitch / dt) * k,
  }
}

/** The velocity to fling with on release: none if the pointer had already stopped. */
export function releaseVelocity(velocity: AngularVelocity, msSinceLastMove: number): AngularVelocity {
  return msSinceLastMove > RELEASE_HOLD_MS ? ZERO_VELOCITY : velocity
}
