import { create } from 'zustand'
import type { HandFrame } from '../core/hands/HandFrame'

/** A recorded tracker result, re-timed to now. */
export type ReplayFrame = HandFrame & { inferenceMs: number }

type ReplayState = {
  /** While true, replayed frames replace the live camera tracker. */
  active: boolean
  name: string | null
  /** Video size the recording was made at. */
  video: { width: number; height: number }
  frame: ReplayFrame | null
  setActive: (active: boolean, name?: string | null, video?: { width: number; height: number }) => void
  setFrame: (frame: ReplayFrame) => void
}

export const useReplayStore = create<ReplayState>()((set) => ({
  active: false,
  name: null,
  video: { width: 1280, height: 720 },
  frame: null,
  setActive: (active, name = null, video) => set((s) => ({ active, name, video: video ?? s.video, frame: active ? s.frame : null })),
  setFrame: (frame) => set({ frame }),
}))
