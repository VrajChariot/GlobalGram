import { describe, expect, it } from 'vitest'
import { coachMessage, type CoachInput } from './coachMessage'

const base: CoachInput = {
  camera: 'live',
  cameraError: null,
  tracker: 'ready',
  events: 'ready',
  replaying: false,
  hand: true,
  phase: 'Hovering',
  hovered: null,
  selected: false,
  selectionMode: 'pinch',
  learned: [],
}

describe('coachMessage', () => {
  it('reports an event load error over camera progress', () => {
    const message = coachMessage({ ...base, events: 'error', camera: 'starting' })
    expect(message).toEqual({ kind: 'error', text: "Couldn't load events. Reload the page to try again." })
  })

  it('says nothing for a mouse-only user, and asks for a hand when replaying without one', () => {
    expect(coachMessage({ ...base, camera: 'off', hand: false })).toBeNull()
    expect(coachMessage({ ...base, camera: 'off', replaying: true, hand: false })?.text).toBe('Raise a hand in front of the camera.')
  })

  it('retires the hover tip once the user has selected by hand', () => {
    const hovered = { ...base, hovered: { members: 1 } }
    expect(coachMessage(hovered)?.text).toBe('Pinch and release to open this event.')
    expect(coachMessage({ ...hovered, learned: ['select'] })?.text).toBe('Pinch and drag to turn the globe.')
  })

  it('names the cluster size and the selection mode', () => {
    const message = coachMessage({ ...base, hovered: { members: 5 }, selectionMode: 'dwell' })
    expect(message?.text).toBe('Hold still to zoom into these 5 events.')
  })

  it('teaches letting go during a drag ahead of the hover tip', () => {
    const message = coachMessage({ ...base, phase: 'RotateDrag', hovered: { members: 1 } })
    expect(message?.text).toBe('Open your fingers to let go.')
  })

  it('includes the camera error verbatim', () => {
    const message = coachMessage({ ...base, camera: 'error', cameraError: 'No camera found.' })
    expect(message).toEqual({ kind: 'error', text: 'No camera found. You can still turn the globe with your mouse.' })
  })
})
