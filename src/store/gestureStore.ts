import { create } from 'zustand'

/** Screen point in CSS pixels, and what produced it. */
export type CursorPosition = { x: number; y: number; source: 'mouse' | 'hand' }

type GestureState = {
  /** Where the user is pointing, or null when nothing is pointing. */
  cursor: CursorPosition | null
  setCursor: (cursor: CursorPosition | null) => void
}

export const useGestureStore = create<GestureState>()((set) => ({
  cursor: null,
  setCursor: (cursor) => set({ cursor }),
}))
