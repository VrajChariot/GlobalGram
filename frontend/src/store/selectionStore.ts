import { create } from 'zustand'

type SelectionState = {
  /** Event id of the beam the reticle is locked on (a cluster's representative for clusters). */
  hoveredId: string | null
  /** That beam's index in eventStore.clusters / the screen cache, or −1. */
  hoveredIndex: number
  selectedId: string | null
  /** 0..1 progress of dwell-to-select on the hovered beam. */
  dwellProgress: number
  setHovered: (id: string | null, index: number) => void
  setSelectedId: (id: string | null) => void
  setDwellProgress: (progress: number) => void
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  hoveredId: null,
  hoveredIndex: -1,
  selectedId: null,
  dwellProgress: 0,
  setHovered: (hoveredId, hoveredIndex) => set({ hoveredId, hoveredIndex }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setDwellProgress: (dwellProgress) => set({ dwellProgress }),
}))
