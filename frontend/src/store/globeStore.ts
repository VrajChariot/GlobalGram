import { create } from 'zustand'
import { ZERO_VELOCITY, type AngularVelocity } from '../core/motion/inertia'

type GlobeState = {
  /** Target orientation in radians; the render loop eases the globe towards it. */
  yaw: number
  pitch: number
  /** Target camera distance from the globe centre. */
  distance: number
  /** Free-spin velocity, applied while nothing is dragging. */
  velocity: AngularVelocity
  isDragging: boolean
  /** performance.now() of the last user input, for idle detection. */
  lastInputAt: number
  setOrientation: (yaw: number, pitch: number) => void
  setDistance: (distance: number) => void
  setVelocity: (velocity: AngularVelocity) => void
  setDragging: (isDragging: boolean) => void
  setLastInputAt: (time: number) => void
}

export const useGlobeStore = create<GlobeState>()((set) => ({
  yaw: 0.6,
  pitch: 0.25,
  distance: 3.0,
  velocity: ZERO_VELOCITY,
  isDragging: false,
  lastInputAt: 0,
  setOrientation: (yaw, pitch) => set({ yaw, pitch }),
  setDistance: (distance) => set({ distance }),
  setVelocity: (velocity) => set({ velocity }),
  setDragging: (isDragging) => set({ isDragging }),
  setLastInputAt: (lastInputAt) => set({ lastInputAt }),
}))
