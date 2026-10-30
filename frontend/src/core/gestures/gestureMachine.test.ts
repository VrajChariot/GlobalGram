import { describe, expect, it } from 'vitest'
import { gaussian, mulberry32 } from '../math/random'
import { INITIAL_GESTURE_STATE, type GestureEffect, type GestureInput, type GestureState, type HandInput } from './GestureState'
import { stepGesture } from './gestureMachine'

/** 1600px wide: the drag threshold (3%) is 48px. */
const VIEWPORT = 1600
const FRAME_MS = 33

const OPEN = 0.8
const PINCHED = 0.1
/** Flat palm: thumb spread wide from the index. */
const PALM = 0.9

function hand(x: number, y: number, pinchDist = OPEN, openness = 0.5): HandInput {
  return { pinchDist, pinchPoint: { x, y }, openness }
}

/** Feeds frames through the machine, collecting every effect. */
class Session {
  state: GestureState = INITIAL_GESTURE_STATE
  time = 0
  effects: GestureEffect[] = []

  frame(primary: HandInput | null, secondary: HandInput | null = null, dt = FRAME_MS): GestureEffect[] {
    this.time += dt
    const input: GestureInput = { time: this.time, viewportWidth: VIEWPORT, primary, secondary }
    const step = stepGesture(this.state, input)
    this.state = step.state
    this.effects.push(...step.effects)
    return step.effects
  }

  frames(n: number, primary: HandInput | null, secondary: HandInput | null = null): void {
    for (let i = 0; i < n; i++) this.frame(primary, secondary)
  }

  count(type: GestureEffect['type']): number {
    return this.effects.filter((e) => e.type === type).length
  }

  /** Sum of all drag deltas. */
  dragged(): { dx: number; dy: number } {
    return this.effects.reduce(
      (sum, e) => (e.type === 'drag' ? { dx: sum.dx + e.dx, dy: sum.dy + e.dy } : sum),
      { dx: 0, dy: 0 },
    )
  }
}

describe('presence', () => {
  it('goes Idle → Hovering when a hand appears', () => {
    const s = new Session()
    expect(s.state.phase).toBe('Idle')
    s.frame(hand(100, 100))
    expect(s.state.phase).toBe('Hovering')
  })

  it('stays Idle with no hand', () => {
    const s = new Session()
    s.frames(10, null)
    expect(s.state.phase).toBe('Idle')
    expect(s.effects).toEqual([])
  })
})

describe('tap vs drag', () => {
  it('a quick, still pinch is a select at the pinch point', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frames(3, hand(500, 300, PINCHED))
    expect(s.state.phase).toBe('PinchPending')
    s.frame(hand(501, 300))
    expect(s.effects).toEqual([{ type: 'select', point: { x: 500, y: 300 } }])
    expect(s.state.phase).toBe('Hovering')
  })

  it('a pinch held longer than the tap limit (350 ms) is not a select', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frames(12, hand(500, 300, PINCHED)) // ~400 ms
    s.frame(hand(500, 300))
    expect(s.count('select')).toBe(0)
    expect(s.state.phase).toBe('Hovering')
  })

  it('moving < 3% within the tap window still selects', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frame(hand(500, 300, PINCHED))
    s.frame(hand(530, 300, PINCHED)) // 30px < 48px
    s.frame(hand(530, 300))
    expect(s.count('select')).toBe(1)
    expect(s.count('dragStart')).toBe(0)
  })

  it('moving ≥ 3% turns the pinch into a drag, keeping the movement that crossed the threshold', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frame(hand(500, 300, PINCHED))
    s.frame(hand(560, 310, PINCHED))
    expect(s.state.phase).toBe('RotateDrag')
    expect(s.effects).toEqual([{ type: 'dragStart' }, { type: 'drag', dx: 60, dy: 10 }])
    s.frame(hand(600, 300, PINCHED))
    expect(s.dragged()).toEqual({ dx: 100, dy: 0 })
  })

  it('releasing a drag ends it without a select, even if it was quick', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frame(hand(500, 300, PINCHED))
    s.frame(hand(600, 300, PINCHED))
    s.frame(hand(600, 300))
    expect(s.count('dragEnd')).toBe(1)
    expect(s.count('select')).toBe(0)
    expect(s.state.phase).toBe('Hovering')
  })

  it('still starts a drag after holding the pinch still (no lost slow drags)', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frames(20, hand(500, 300, PINCHED)) // ~660 ms of holding still
    for (let x = 505; x <= 560; x += 5) s.frame(hand(x, 300, PINCHED))
    expect(s.state.phase).toBe('RotateDrag')
    expect(s.dragged().dx).toBe(60)
  })
})

describe('releasing a drag', () => {
  /** Resting ~0.6, then a drag at ~0.12: release threshold ≈ min(0.40, halfway back to rest). */
  function dragging(): Session {
    const s = new Session()
    s.frames(10, hand(500, 300, 0.6))
    s.frame(hand(500, 300, 0.12))
    s.frame(hand(600, 300, 0.12))
    expect(s.state.phase).toBe('RotateDrag')
    return s
  }

  it('survives a one-frame spike open, losing no movement', () => {
    const s = dragging()
    s.frame(hand(610, 300, 0.38)) // noisy frame: past the relative release, below 0.40
    expect(s.state.phase).toBe('RotateDrag')
    s.frame(hand(640, 300, 0.12))
    expect(s.count('dragEnd')).toBe(0)
    expect(s.dragged().dx).toBe(140)
  })

  it('ends at once when the pinch opens past 0.40', () => {
    const s = dragging()
    s.frame(hand(600, 300, 0.45))
    expect(s.state.phase).toBe('Hovering')
    expect(s.count('dragEnd')).toBe(1)
  })

  it('ends a shallow release once it has stayed open for 120 ms, dated to when it began', () => {
    const s = dragging()
    const openedAt = s.time + FRAME_MS
    s.frames(4, hand(600, 300, 0.38)) // open for 99 ms: not yet
    expect(s.state.phase).toBe('RotateDrag')
    s.frame(hand(600, 300, 0.38)) // 132 ms
    expect(s.state.phase).toBe('Hovering')
    expect(s.effects.find((e) => e.type === 'dragEnd')).toEqual({ type: 'dragEnd', releasedAt: openedAt })
  })
})

describe('pinch hysteresis', () => {
  it('does not start between 0.25 and 0.40', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frames(5, hand(500, 300, 0.3))
    expect(s.state.phase).toBe('Hovering')
    s.frame(hand(500, 300, 0.24))
    expect(s.state.phase).toBe('PinchPending')
  })

  it('does not end a drag until the pinch opens past 0.40', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frame(hand(500, 300, PINCHED))
    s.frame(hand(600, 300, PINCHED))
    // Fingers drifting apart mid-drag, but not past the end threshold.
    s.frame(hand(610, 300, 0.32))
    s.frame(hand(620, 300, 0.39))
    expect(s.state.phase).toBe('RotateDrag')
    s.frame(hand(630, 300, 0.41))
    expect(s.state.phase).toBe('Hovering')
    expect(s.count('dragEnd')).toBe(1)
  })
})

describe('hand loss', () => {
  it('keeps a drag alive through a dropout shorter than 150 ms', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frame(hand(500, 300, PINCHED))
    s.frame(hand(600, 300, PINCHED))
    s.frame(null, null, 60)
    s.frame(null, null, 60) // 120 ms gone
    expect(s.state.phase).toBe('RotateDrag')
    s.frame(hand(650, 300, PINCHED))
    expect(s.dragged().dx).toBe(150)
    expect(s.count('dragEnd')).toBe(0)
  })

  it('ends a drag and returns to Idle after 150 ms without a hand', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frame(hand(500, 300, PINCHED))
    s.frame(hand(600, 300, PINCHED))
    s.frame(null, null, 100)
    expect(s.state.phase).toBe('RotateDrag')
    s.frame(null, null, 60)
    expect(s.state.phase).toBe('Idle')
    expect(s.count('dragEnd')).toBe(1)
  })

  it('never selects when the hand vanishes mid-pinch', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frame(hand(500, 300, PINCHED))
    s.frame(null, null, 200)
    expect(s.state.phase).toBe('Idle')
    s.frame(hand(500, 300))
    expect(s.count('select')).toBe(0)
  })

  it('a hovering hand that disappears goes Idle silently', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frame(null, null, 200)
    expect(s.state.phase).toBe('Idle')
    expect(s.effects).toEqual([])
  })
})

describe('two-hand zoom', () => {
  it('starts when the second hand pinches, zooming by the change in hand span', () => {
    const s = new Session()
    s.frame(hand(600, 400), hand(1000, 400))
    s.frame(hand(600, 400), hand(1000, 400, PINCHED))
    expect(s.state.phase).toBe('TwoHandZoom')
    expect(s.count('zoomStart')).toBe(1)
    // Span 400 → 800: hands apart, zoom in (camera distance halves).
    const effects = s.frame(hand(400, 400), hand(1200, 400, PINCHED))
    expect(effects).toEqual([{ type: 'zoom', scale: 0.5 }])
  })

  it('ends when the second hand opens, without a stray select from the primary', () => {
    const s = new Session()
    s.frame(hand(600, 400), hand(1000, 400))
    // Both hands pinch together; the primary stays pinched through the zoom.
    s.frame(hand(600, 400, PINCHED), hand(1000, 400, PINCHED))
    s.frames(5, hand(600, 400, PINCHED), hand(1100, 400, PINCHED))
    s.frame(hand(600, 400, PINCHED), hand(1100, 400))
    expect(s.state.phase).toBe('Hovering')
    expect(s.count('zoomEnd')).toBe(1)
    // The primary releases quickly and still: it must not count as a tap.
    s.frame(hand(600, 400), hand(1100, 400))
    expect(s.count('select')).toBe(0)
    expect(s.state.phase).toBe('Hovering')
  })

  it('a second pinch during PinchPending cancels the tap and zooms', () => {
    const s = new Session()
    s.frame(hand(600, 400), hand(1000, 400))
    s.frame(hand(600, 400, PINCHED), hand(1000, 400))
    expect(s.state.phase).toBe('PinchPending')
    s.frame(hand(600, 400, PINCHED), hand(1000, 400, PINCHED))
    expect(s.state.phase).toBe('TwoHandZoom')
    s.frame(hand(600, 400), hand(1000, 400))
    expect(s.count('select')).toBe(0)
  })

  it('ends when the second hand leaves the frame', () => {
    const s = new Session()
    s.frame(hand(600, 400), hand(1000, 400, PINCHED))
    expect(s.state.phase).toBe('TwoHandZoom')
    s.frame(hand(600, 400), null)
    expect(s.state.phase).toBe('Hovering')
    expect(s.count('zoomEnd')).toBe(1)
  })

  it('ends with zoomEnd if both hands are lost', () => {
    const s = new Session()
    s.frame(hand(600, 400), hand(1000, 400, PINCHED))
    s.frame(null, null, 200)
    expect(s.state.phase).toBe('Idle')
    expect(s.count('zoomEnd')).toBe(1)
  })

  it('a second hand pinching mid-drag does not interrupt the rotation', () => {
    const s = new Session()
    s.frame(hand(500, 300))
    s.frame(hand(500, 300, PINCHED))
    s.frame(hand(600, 300, PINCHED))
    s.frame(hand(620, 300, PINCHED), hand(1200, 300, PINCHED))
    expect(s.state.phase).toBe('RotateDrag')
    expect(s.count('zoomStart')).toBe(0)
  })
})

describe('open palm', () => {
  it('fires once after 300 ms open, and re-arms after closing', () => {
    const s = new Session()
    s.frames(5, hand(500, 300, PALM, 0.95)) // 165 ms
    expect(s.count('openPalm')).toBe(0)
    s.frames(10, hand(500, 300, PALM, 0.95))
    expect(s.count('openPalm')).toBe(1)
    s.frames(20, hand(500, 300, PALM, 0.95))
    expect(s.count('openPalm')).toBe(1)
    s.frame(hand(500, 300, PALM, 0.4))
    s.frames(12, hand(500, 300, PALM, 0.95))
    expect(s.count('openPalm')).toBe(2)
  })

  it('a relaxed open hand with the thumb by the index does not fire', () => {
    const s = new Session()
    s.frames(20, hand(500, 300, 0.5, 0.95))
    expect(s.count('openPalm')).toBe(0)
  })

  it('a brief open hand does not fire', () => {
    const s = new Session()
    s.frames(5, hand(500, 300, PALM, 0.95))
    s.frame(hand(500, 300, PALM, 0.5))
    s.frames(5, hand(500, 300, PALM, 0.95))
    expect(s.count('openPalm')).toBe(0)
  })
})

describe('reliability', () => {
  it('10 rotations in a row: 10 drags, 10 releases, no accidental selects', () => {
    const random = mulberry32(2026)
    const jitter = () => gaussian(random) * 3 // ±3px cursor noise
    const pinchNoise = (base: number) => base + gaussian(random) * 0.04
    const s = new Session()
    s.frames(5, hand(800, 450))

    for (let rotation = 0; rotation < 10; rotation++) {
      const direction = rotation % 2 === 0 ? 1 : -1
      // Settle, pinch, drag ~300px over ~400 ms with a dropped frame, release, rest.
      s.frames(4, hand(800 + jitter(), 450 + jitter(), pinchNoise(0.7)))
      s.frames(2, hand(800 + jitter(), 450 + jitter(), pinchNoise(0.12)))
      for (let i = 1; i <= 12; i++) {
        if (i === 6) s.frame(null, null, 40)
        s.frame(hand(800 + direction * i * 25 + jitter(), 450 + i * 4 + jitter(), pinchNoise(0.12)))
      }
      s.frames(3, hand(800 + direction * 300 + jitter(), 498 + jitter(), pinchNoise(0.7)))
      s.frames(6, hand(800 + jitter(), 450 + jitter(), pinchNoise(0.7)))
    }

    expect(s.count('dragStart')).toBe(10)
    expect(s.count('dragEnd')).toBe(10)
    expect(s.count('select')).toBe(0)
    expect(s.state.phase).toBe('Hovering')
  })
})
