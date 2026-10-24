import { create } from 'zustand'

type SelectionState = {
  /** Event id of the beam under the cursor (a cluster's representative for clusters). */
  hoveredId: string | null
  selectedId: string | null
  setHoveredId: (id: string | null) => void
  setSelectedId: (id: string | null) => void
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  hoveredId: null,
  selectedId: null,
  setHoveredId: (hoveredId) => set({ hoveredId }),
  setSelectedId: (selectedId) => set({ selectedId }),
}))
