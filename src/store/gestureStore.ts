import { create } from 'zustand'
import type { GesturePhase } from '../core/gestures/GestureState'

/** Screen point in CSS pixels, and what produced it. */
export type CursorPosition = { x: number; y: number; source: 'mouse' | 'hand' }

type GestureState = {
  /** Where the user is pointing, or null when nothing is pointing. */
  cursor: CursorPosition | null
  /** Current hand-gesture phase. */
  phase: GesturePhase
  setCursor: (cursor: CursorPosition | null) => void
  setPhase: (phase: GesturePhase) => void
}

export const useGestureStore = create<GestureState>()((set) => ({
  cursor: null,
  phase: 'Idle',
  setCursor: (cursor) => set({ cursor }),
  setPhase: (phase) => set({ phase }),
}))
