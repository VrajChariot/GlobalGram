import { describe, expect, it } from 'vitest'
import { coverVisibleRegion, interactionBox, interactionBoxScale, interactionBoxToView, videoToView } from './interactionBox'

const VIDEO = { width: 1280, height: 720 }

describe('coverVisibleRegion', () => {
  it('shows the whole frame when aspect ratios match', () => {
    expect(coverVisibleRegion(VIDEO, { width: 1920, height: 1080 })).toEqual({ x0: 0, y0: 0, x1: 1, y1: 1 })
  })

  it('crops the sides on a portrait viewport', () => {
    // 16:9 video in a 9:16 viewport: only the middle (9/16)/(16/9) ≈ 31.6% of the width shows.
    const r = coverVisibleRegion(VIDEO, { width: 900, height: 1600 })
    expect(r.y0).toBeCloseTo(0)
    expect(r.y1).toBeCloseTo(1)
    expect(r.x1 - r.x0).toBeCloseTo((9 / 16) / (16 / 9))
    expect((r.x0 + r.x1) / 2).toBeCloseTo(0.5)
  })

  it('crops top and bottom on an ultra-wide viewport', () => {
    const r = coverVisibleRegion(VIDEO, { width: 2560, height: 1080 })
    expect(r.x0).toBeCloseTo(0)
    expect(r.y1 - r.y0).toBeCloseTo((1080 / 2560) / (720 / 1280))
  })
})

describe('videoToView', () => {
  it('maps the visible region edges to the viewport edges', () => {
    const view = { width: 900, height: 1600 }
    const r = coverVisibleRegion(VIDEO, view)
    expect(videoToView(r.x0, 0, VIDEO, view).x).toBeCloseTo(0)
    expect(videoToView(r.x1, 1, VIDEO, view)).toEqual({ x: expect.closeTo(900), y: expect.closeTo(1600) })
    expect(videoToView(0.5, 0.5, VIDEO, view)).toEqual({ x: expect.closeTo(450), y: expect.closeTo(800) })
  })
})

describe('interactionBoxToView', () => {
  const view = { width: 1600, height: 900 }

  it('maps the central 70% of the frame to the full viewport', () => {
    expect(interactionBoxToView(0.15, 0.15, VIDEO, view)).toEqual({ x: expect.closeTo(0), y: expect.closeTo(0) })
    expect(interactionBoxToView(0.85, 0.85, VIDEO, view)).toEqual({ x: expect.closeTo(1600), y: expect.closeTo(900) })
    expect(interactionBoxToView(0.5, 0.5, VIDEO, view)).toEqual({ x: expect.closeTo(800), y: expect.closeTo(450) })
  })

  it('clamps points outside the box to the screen edge', () => {
    expect(interactionBoxToView(0.02, 0.99, VIDEO, view)).toEqual({ x: 0, y: 900 })
  })

  it('takes the 70% of what is visible, not of the raw frame', () => {
    const portrait = { width: 900, height: 1600 }
    const box = interactionBox(VIDEO, portrait)
    const visible = coverVisibleRegion(VIDEO, portrait)
    expect(box.x1 - box.x0).toBeCloseTo((visible.x1 - visible.x0) * 0.7)
    expect(interactionBoxToView(box.x0, box.y0, VIDEO, portrait)).toEqual({ x: expect.closeTo(0), y: expect.closeTo(0) })
  })
})

describe('interactionBoxScale', () => {
  it('is the viewport size over the box size', () => {
    const view = { width: 1600, height: 900 }
    const scale = interactionBoxScale(VIDEO, view)
    expect(scale.x).toBeCloseTo(1600 / 0.7)
    expect(scale.y).toBeCloseTo(900 / 0.7)
  })

  it('matches the slope of interactionBoxToView', () => {
    const view = { width: 1600, height: 900 }
    const a = interactionBoxToView(0.5, 0.5, VIDEO, view)
    const b = interactionBoxToView(0.51, 0.5, VIDEO, view)
    expect((b.x - a.x) / 0.01).toBeCloseTo(interactionBoxScale(VIDEO, view).x)
  })
})
