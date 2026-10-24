import { describe, expect, it } from 'vitest'
import { decay, releaseVelocity, stepInertia, trackVelocity, ZERO_VELOCITY } from './inertia'
import { MAX_PITCH } from './orbit'

describe('decay', () => {
  it('multiplies by 0.92 per 60 Hz frame', () => {
    expect(decay(1, 1 / 60)).toBeCloseTo(0.92)
  })

  it('is frame-rate independent', () => {
    let at60 = 1
    for (let i = 0; i < 2; i++) at60 = decay(at60, 1 / 60)
    expect(decay(1, 1 / 30)).toBeCloseTo(at60)
  })

  it('snaps tiny speeds to rest', () => {
    expect(decay(0.001, 1 / 60)).toBe(0)
  })
})

describe('stepInertia', () => {
  it('integrates velocity and decays it', () => {
    const { orientation, velocity } = stepInertia({ yaw: 0, pitch: 0 }, { yaw: 1.2, pitch: -0.6 }, 1 / 60)
    expect(orientation.yaw).toBeCloseTo(0.02)
    expect(orientation.pitch).toBeCloseTo(-0.01)
    expect(velocity.yaw).toBeCloseTo(1.2 * 0.92)
  })

  it('stops pitch velocity at the clamp but keeps yaw spinning', () => {
    const { orientation, velocity } = stepInertia({ yaw: 0, pitch: MAX_PITCH - 0.001 }, { yaw: 1, pitch: 2 }, 1 / 60)
    expect(orientation.pitch).toBe(MAX_PITCH)
    expect(velocity.pitch).toBe(0)
    expect(velocity.yaw).toBeGreaterThan(0)
  })

  it('comes to rest eventually', () => {
    let state = { orientation: { yaw: 0, pitch: 0 }, velocity: { yaw: 5, pitch: 0 } }
    for (let i = 0; i < 200; i++) state = stepInertia(state.orientation, state.velocity, 1 / 60)
    expect(state.velocity).toEqual(ZERO_VELOCITY)
  })
})

describe('trackVelocity', () => {
  it('converges on a steady drag speed', () => {
    let v = ZERO_VELOCITY
    for (let i = 0; i < 20; i++) v = trackVelocity(v, 0.05, 0, 1 / 60)
    expect(v.yaw).toBeCloseTo(3)
  })

  it('ignores zero-length intervals', () => {
    const v = { yaw: 1, pitch: 1 }
    expect(trackVelocity(v, 1, 1, 0)).toBe(v)
  })
})

describe('releaseVelocity', () => {
  it('flings on a moving release and not after holding still', () => {
    const v = { yaw: 2, pitch: 0 }
    expect(releaseVelocity(v, 16)).toBe(v)
    expect(releaseVelocity(v, 200)).toEqual(ZERO_VELOCITY)
  })
})
