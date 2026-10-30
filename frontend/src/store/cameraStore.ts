import { create } from 'zustand'

/** checking: asking the browser about permission · undecided: show the intro · off: user chose mouse only. */
export type CameraStatus = 'checking' | 'undecided' | 'starting' | 'live' | 'off' | 'error'

type CameraState = {
  status: CameraStatus
  error: string | null
  setStatus: (status: CameraStatus, error?: string | null) => void
}

export const useCameraStore = create<CameraState>()((set) => ({
  status: 'checking',
  error: null,
  setStatus: (status, error = null) => set({ status, error }),
}))
