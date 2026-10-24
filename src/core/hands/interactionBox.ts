export type Size = { width: number; height: number }
export type Rect = { x0: number; y0: number; x1: number; y1: number }

/** Share of the visible camera frame (centred) that maps to the whole viewport. */
export const INTERACTION_BOX_FRACTION = 0.7

/**
 * Part of the video (normalised 0..1 coordinates) that stays visible when it
 * is shown with object-fit: cover in a viewport of the given size.
 */
export function coverVisibleRegion(video: Size, view: Size): Rect {
  const scale = Math.max(view.width / video.width, view.height / video.height)
  const w = view.width / scale / video.width
  const h = view.height / scale / video.height
  return { x0: (1 - w) / 2, y0: (1 - h) / 2, x1: (1 + w) / 2, y1: (1 + h) / 2 }
}

/** Where a normalised video point is drawn on screen (CSS px), under object-fit: cover. */
export function videoToView(x: number, y: number, video: Size, view: Size): { x: number; y: number } {
  const r = coverVisibleRegion(video, view)
  return {
    x: ((x - r.x0) / (r.x1 - r.x0)) * view.width,
    y: ((y - r.y0) / (r.y1 - r.y0)) * view.height,
  }
}

/** The interaction box in normalised video coordinates: the central `fraction` of the visible region. */
export function interactionBox(video: Size, view: Size, fraction = INTERACTION_BOX_FRACTION): Rect {
  const r = coverVisibleRegion(video, view)
  const padX = ((r.x1 - r.x0) * (1 - fraction)) / 2
  const padY = ((r.y1 - r.y0) * (1 - fraction)) / 2
  return { x0: r.x0 + padX, y0: r.y0 + padY, x1: r.x1 - padX, y1: r.y1 - padY }
}

/**
 * Maps a normalised (mirrored) video point to viewport pixels so the
 * interaction box spans the whole screen; points outside it clamp to the edge.
 */
export function interactionBoxToView(x: number, y: number, video: Size, view: Size, fraction = INTERACTION_BOX_FRACTION): { x: number; y: number } {
  const box = interactionBox(video, view, fraction)
  const u = Math.min(1, Math.max(0, (x - box.x0) / (box.x1 - box.x0)))
  const v = Math.min(1, Math.max(0, (y - box.y0) / (box.y1 - box.y0)))
  return { x: u * view.width, y: v * view.height }
}

/** Screen pixels per normalised video unit inside the interaction box: how much hand jitter is magnified. */
export function interactionBoxScale(video: Size, view: Size, fraction = INTERACTION_BOX_FRACTION): { x: number; y: number } {
  const box = interactionBox(video, view, fraction)
  return { x: view.width / (box.x1 - box.x0), y: view.height / (box.y1 - box.y0) }
}
