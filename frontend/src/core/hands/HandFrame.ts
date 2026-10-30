/** MediaPipe landmark in normalised video coordinates (x, y in 0..1; z relative depth, x-scaled). */
export type Landmark = { x: number; y: number; z: number }

export type Handedness = 'Left' | 'Right'

export type TrackedHand = {
  /** 21 landmarks, MediaPipe hand topology. */
  landmarks: Landmark[]
  handedness: Handedness
  score: number
}

export type HandFrame = {
  hands: TrackedHand[]
  /** performance.now() when the video frame was captured. */
  timestamp: number
}

export const LANDMARK = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
} as const

export const FINGERTIPS = [LANDMARK.THUMB_TIP, LANDMARK.INDEX_TIP, LANDMARK.MIDDLE_TIP, LANDMARK.RING_TIP, LANDMARK.PINKY_TIP]

/** Bones for drawing a skeleton. */
export const HAND_CONNECTIONS: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

/**
 * Mirrors a hand to match the mirrored video (x = 1 − x). MediaPipe labels
 * handedness as if the input were already mirrored; ours isn't, so the label
 * flips too and then names the user's actual hand.
 */
export function mirrorHand(hand: TrackedHand): TrackedHand {
  return {
    landmarks: hand.landmarks.map((l) => ({ x: 1 - l.x, y: l.y, z: l.z })),
    handedness: hand.handedness === 'Left' ? 'Right' : 'Left',
    score: hand.score,
  }
}
