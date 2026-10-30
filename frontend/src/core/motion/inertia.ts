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

/**
 * The velocity to fling with on release: none if the pointer had already
 * stopped, or if the release is slower than `minSpeed` (rad/s).
 */
export function releaseVelocity(velocity: AngularVelocity, msSinceLastMove: number, minSpeed = 0): AngularVelocity {
  if (msSinceLastMove > RELEASE_HOLD_MS) return ZERO_VELOCITY
  return Math.hypot(velocity.yaw, velocity.pitch) < minSpeed ? ZERO_VELOCITY : velocity
}

/** An orientation sample taken during a drag. `time` in ms. */
export type OrientationSample = { time: number; yaw: number; pitch: number }

/** Release velocity is measured over this much of the drag's end. */
export const FLING_WINDOW_MS = 200

/**
 * Average angular velocity over the last `windowMs` before `endTime`. For
 * low-rate input (hands at ~20 Hz) this is far steadier than the last frame:
 * a flick still flings even if the hand slowed while the pinch was opening,
 * while a drag that stopped well before release measures ~0.
 */
export function velocityOverWindow(samples: readonly OrientationSample[], endTime: number, windowMs = FLING_WINDOW_MS): AngularVelocity {
  const recent = samples.filter((s) => s.time >= endTime - windowMs && s.time <= endTime)
  if (recent.length < 2) return ZERO_VELOCITY
  const first = recent[0]
  // Hold the last orientation until endTime, so a hand that stopped before release reads as slow.
  const last = recent[recent.length - 1]
  const dt = (endTime - first.time) / 1000
  if (dt <= 0) return ZERO_VELOCITY
  return { yaw: (last.yaw - first.yaw) / dt, pitch: (last.pitch - first.pitch) / dt }
}

/**
 * Where a drag at `velocity` would be `elapsedS` after its last sample. Lets
 * the render loop move smoothly between low-rate input samples instead of
 * stepping. The lead grows up to `maxLeadS`, then fades back to 0 over another
 * `maxLeadS`: input that has gone quiet (a mouse held still sends no events)
 * means the drag stopped, so the prediction must not hold the globe ahead.
 */
export function predictOrientation(orientation: Orientation, velocity: AngularVelocity, elapsedS: number, maxLeadS: number): Orientation {
  const t = Math.max(elapsedS, 0)
  const lead = t <= maxLeadS ? t : Math.max(0, 2 * maxLeadS - t)
  return { yaw: orientation.yaw + velocity.yaw * lead, pitch: clampPitch(orientation.pitch + velocity.pitch * lead) }
}
