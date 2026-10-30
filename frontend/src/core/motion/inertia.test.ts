import { describe, expect, it } from 'vitest'
import { decay, predictOrientation, releaseVelocity, stepInertia, trackVelocity, velocityOverWindow, ZERO_VELOCITY } from './inertia'
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

  it('drops releases slower than the minimum fling speed', () => {
    expect(releaseVelocity({ yaw: 0.3, pitch: 0.3 }, 16, 0.6)).toEqual(ZERO_VELOCITY)
    expect(releaseVelocity({ yaw: 1, pitch: 0 }, 16, 0.6)).toEqual({ yaw: 1, pitch: 0 })
  })
})

describe('velocityOverWindow', () => {
  /** 20 Hz samples moving at `speed` rad/s from t=0 to `until` ms, then holding still. */
  function drag(speed: number, until: number, end: number) {
    const samples = []
    for (let t = 0; t <= end; t += 50) samples.push({ time: t, yaw: (Math.min(t, until) / 1000) * speed, pitch: 0 })
    return samples
  }

  it('measures a steady drag', () => {
    expect(velocityOverWindow(drag(2, 1000, 1000), 1000).yaw).toBeCloseTo(2)
  })

  it('still flings when the last frame before release was slow', () => {
    // Moving until 950 ms, release detected at 1000 ms: the last frame alone says ~0.
    expect(velocityOverWindow(drag(2, 950, 1000), 1000).yaw).toBeGreaterThan(1.4)
  })

  it('reads ~0 for a drag that stopped well before release', () => {
    expect(velocityOverWindow(drag(2, 600, 1000), 1000).yaw).toBeCloseTo(0)
  })

  it('needs two samples in the window', () => {
    expect(velocityOverWindow([{ time: 0, yaw: 0, pitch: 0 }], 10)).toEqual(ZERO_VELOCITY)
  })
})

describe('predictOrientation', () => {
  it('extrapolates by velocity up to the max lead', () => {
    expect(predictOrientation({ yaw: 1, pitch: 0 }, { yaw: 2, pitch: 0 }, 0.03, 0.08).yaw).toBeCloseTo(1.06)
    expect(predictOrientation({ yaw: 1, pitch: 0 }, { yaw: 2, pitch: 0 }, 0.08, 0.08).yaw).toBeCloseTo(1.16)
  })

  it('fades the lead out when input goes quiet', () => {
    expect(predictOrientation({ yaw: 1, pitch: 0 }, { yaw: 2, pitch: 0 }, 0.12, 0.08).yaw).toBeCloseTo(1.08)
    expect(predictOrientation({ yaw: 1, pitch: 0 }, { yaw: 2, pitch: 0 }, 0.5, 0.08).yaw).toBe(1)
  })

  it('never predicts backwards in time or past the pitch clamp', () => {
    expect(predictOrientation({ yaw: 1, pitch: 0 }, { yaw: 2, pitch: 0 }, -1, 0.08).yaw).toBe(1)
    expect(predictOrientation({ yaw: 0, pitch: 1.04 }, { yaw: 0, pitch: 10 }, 0.08, 0.08).pitch).toBeCloseTo(Math.PI / 3)
  })
})
