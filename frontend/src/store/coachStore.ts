import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Skill = 'hand' | 'rotate' | 'select' | 'zoom' | 'close'

type CoachState = {
  /** Gestures the user has done; their tips stay retired across visits. */
  learned: Skill[]
  learn: (skill: Skill) => void
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set) => ({
      learned: [],
      learn: (skill) => set((s) => (s.learned.includes(skill) ? s : { learned: [...s.learned, skill] })),
    }),
    { name: 'globalgram.coach', version: 1, partialize: (s) => ({ learned: s.learned }) },
  ),
)
