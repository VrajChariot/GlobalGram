import { LANDMARK, type TrackedHand } from './HandFrame'
import type { Point } from './handFeatures'

/** A wrist jumping further than this between frames (normalised video units) is a different hand. */
const MAX_SLOT_JUMP = 0.25

export type HandSlot = { id: number; wrist: Point }

/**
 * Gives each detected hand a stable id by matching wrists to the previous
 * frame's slots (closest pairs first). MediaPipe's Left/Right label flickers
 * on real hands, so it can't be used as an identity: keying filters by it
 * would reset them on every flip.
 */
export function assignHandSlots(hands: readonly TrackedHand[], previous: readonly HandSlot[], nextId: number): { ids: number[]; slots: HandSlot[]; nextId: number } {
  const wrists = hands.map((h) => ({ x: h.landmarks[LANDMARK.WRIST].x, y: h.landmarks[LANDMARK.WRIST].y }))
  const pairs: { hand: number; slot: number; d: number }[] = []
  wrists.forEach((w, hand) =>
    previous.forEach((s, slot) => {
      const d = Math.hypot(w.x - s.wrist.x, w.y - s.wrist.y)
      if (d < MAX_SLOT_JUMP) pairs.push({ hand, slot, d })
    }),
  )
  pairs.sort((a, b) => a.d - b.d)

  const ids = new Array<number>(hands.length).fill(-1)
  const usedSlots = new Set<number>()
  for (const { hand, slot } of pairs) {
    if (ids[hand] >= 0 || usedSlots.has(slot)) continue
    ids[hand] = previous[slot].id
    usedSlots.add(slot)
  }
  for (let i = 0; i < ids.length; i++) if (ids[i] < 0) ids[i] = nextId++

  return { ids, slots: wrists.map((wrist, i) => ({ id: ids[i], wrist })), nextId }
}
