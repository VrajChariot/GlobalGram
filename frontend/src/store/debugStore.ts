import { create } from 'zustand'

type DebugState = {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useDebugStore = create<DebugState>()((set) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),
}))
