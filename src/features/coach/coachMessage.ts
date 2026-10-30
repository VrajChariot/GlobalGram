import type { GesturePhase } from '../../core/gestures/GestureState'
import type { SelectionMode } from '../../shared/config/gestureConfig'
import type { CameraStatus } from '../../store/cameraStore'
import type { Skill } from '../../store/coachStore'
import type { LoadStatus } from '../../store/eventStore'
import type { TrackerStatus } from '../../store/handStore'

export type CoachInput = {
  camera: CameraStatus
  cameraError: string | null
  tracker: TrackerStatus
  events: LoadStatus
  /** Recorded landmarks stand in for the camera. */
  replaying: boolean
  /** A hand is currently tracked. */
  hand: boolean
  phase: GesturePhase
  hovered: { members: number } | null
  selected: boolean
  selectionMode: SelectionMode
  learned: readonly Skill[]
}

export type CoachMessage = { kind: 'status' | 'error' | 'tip'; text: string }

/** What the caption should say right now, if anything. First matching rule wins. */
export function coachMessage(input: CoachInput): CoachMessage | null {
  const { camera, tracker, events, replaying, hand, phase, hovered, selected, selectionMode, learned } = input
  const learnedSkill = (skill: Skill) => learned.includes(skill)
  const pinch = selectionMode === 'pinch'

  if (events === 'error') return { kind: 'error', text: "Couldn't load events. Reload the page to try again." }
  if (camera === 'error') return { kind: 'error', text: `${input.cameraError} You can still turn the globe with your mouse.` }
  if (camera === 'starting') return { kind: 'status', text: "Waiting for camera access. Allow it in your browser's prompt." }
  if (camera === 'live' && tracker === 'error' && !replaying) {
    return { kind: 'error', text: "Hand tracking isn't available in this browser. You can still use your mouse." }
  }
  if (events === 'loading') return { kind: 'status', text: 'Loading events…' }
  if (camera === 'live' && tracker === 'loading' && !replaying) return { kind: 'status', text: 'Loading hand tracking…' }

  if (camera !== 'live' && !replaying) return null

  if (phase === 'RotateDrag' && !learnedSkill('rotate')) return tip('Open your fingers to let go.')
  if (phase === 'TwoHandZoom' && !learnedSkill('zoom')) return tip('Spread your hands to zoom in, bring them together to zoom out.')
  if (!hand) return learnedSkill('hand') ? null : tip('Raise a hand in front of the camera.')
  if (selected && !learnedSkill('close')) return tip('Hold your palm open to close this event.')
  if (hovered && !learnedSkill('select')) {
    const n = hovered.members
    if (n > 1) return tip(pinch ? `Pinch and release to zoom into these ${n} events.` : `Hold still to zoom into these ${n} events.`)
    return tip(pinch ? 'Pinch and release to open this event.' : 'Hold still to open this event.')
  }
  if (!learnedSkill('rotate')) return tip('Pinch and drag to turn the globe.')
  if (!learnedSkill('zoom') && learnedSkill('select')) return tip('Raise both hands and pinch with each to zoom.')
  return null
}

function tip(text: string): CoachMessage {
  return { kind: 'tip', text }
}
