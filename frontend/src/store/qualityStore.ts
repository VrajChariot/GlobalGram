import { create } from 'zustand'

/** high: full look · low: cheaper rendering so the hand tracker gets GPU time. */
export type QualityTier = 'high' | 'low'

type QualityState = {
  tier: QualityTier
  setTier: (tier: QualityTier) => void
}

export const useQualityStore = create<QualityState>()((set) => ({
  tier: 'high',
  setTier: (tier) => set({ tier }),
}))
