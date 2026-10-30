import { describe, expect, it } from 'vitest'
import type { Handedness, TrackedHand } from './HandFrame'
import { assignHandSlots } from './handSlots'

function hand(x: number, y: number, handedness: Handedness = 'Right'): TrackedHand {
  return { landmarks: Array.from({ length: 21 }, () => ({ x, y, z: 0 })), handedness, score: 0.9 }
}

describe('assignHandSlots', () => {
  it('gives new hands fresh ids', () => {
    const r = assignHandSlots([hand(0.3, 0.5), hand(0.7, 0.5)], [], 0)
    expect(r.ids).toEqual([0, 1])
    expect(r.nextId).toBe(2)
  })

  it('keeps ids when the handedness label flips', () => {
    const first = assignHandSlots([hand(0.3, 0.5, 'Right')], [], 0)
    const second = assignHandSlots([hand(0.31, 0.5, 'Left')], first.slots, first.nextId)
    expect(second.ids).toEqual(first.ids)
  })

  it('keeps ids when MediaPipe reorders the hands', () => {
    const first = assignHandSlots([hand(0.3, 0.5), hand(0.7, 0.5)], [], 0)
    const second = assignHandSlots([hand(0.71, 0.5), hand(0.29, 0.5)], first.slots, first.nextId)
    expect(second.ids).toEqual([1, 0])
  })

  it('treats a big jump as a new hand', () => {
    const first = assignHandSlots([hand(0.1, 0.5)], [], 0)
    expect(assignHandSlots([hand(0.9, 0.5)], first.slots, first.nextId).ids).toEqual([1])
  })

  it('gives a second hand appearing next to a tracked one a new id', () => {
    const first = assignHandSlots([hand(0.4, 0.5)], [], 0)
    const second = assignHandSlots([hand(0.42, 0.5), hand(0.55, 0.5)], first.slots, first.nextId)
    expect(second.ids).toEqual([0, 1])
  })
})
