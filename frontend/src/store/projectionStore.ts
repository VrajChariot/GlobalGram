import { create } from 'zustand'

/** The globe's current screen mapping, for projecting points outside the render loop. */
type ProjectionState = {
  /** projection × view × globe model, column-major. */
  mvp: Float32Array
  /** Globe model matrix, column-major. */
  model: Float32Array
  camera: Float32Array
  /** Viewport in CSS pixels. */
  width: number
  height: number
  /** Bumps whenever any of the above changes. */
  version: number
  setProjection: (
    mvp: ArrayLike<number>,
    model: ArrayLike<number>,
    camera: ArrayLike<number>,
    width: number,
    height: number,
  ) => void
}

export const useProjectionStore = create<ProjectionState>()((set) => ({
  mvp: new Float32Array(16),
  model: new Float32Array(16),
  camera: new Float32Array(3),
  width: 1,
  height: 1,
  version: 0,
  setProjection: (mvp, model, camera, width, height) =>
    set((s) => {
      s.mvp.set(mvp)
      s.model.set(model)
      s.camera.set(camera)
      return { width, height, version: s.version + 1 }
    }),
}))
