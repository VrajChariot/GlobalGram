/**
 * Screen-space clustering done on the sphere: a pixel radius is converted to
 * an angle at the current zoom, then events are grouped by angle. The result
 * only depends on zoom, so rotating the globe never reshuffles clusters.
 */

export type Cluster = {
  /** Index of the most important member: the cluster's position and identity. */
  representative: number
  members: number[]
  /** Largest angle (radians) from the representative to any member. */
  spread: number
  maxImportance: number
}

/** Zoom steps of 4% in camera distance; clusters are recomputed when the step changes. */
const ZOOM_STEP = 1.04

/** World units per pixel at the globe's front surface, as an angle on the unit sphere. */
export function angularRadiusForPixels(px: number, distance: number, fovDeg: number, viewportHeight: number): number {
  const worldPerPixel = (2 * Math.tan((fovDeg * Math.PI) / 360) * Math.max(distance - 1, 1e-3)) / viewportHeight
  return px * worldPerPixel
}

/**
 * Camera distance at which a cluster with this spread falls apart, with a
 * margin so its members end up comfortably separate.
 */
export function distanceToSplit(spread: number, px: number, fovDeg: number, viewportHeight: number, margin = 1.25): number {
  return 1 + (spread * viewportHeight) / (px * 2 * Math.tan((fovDeg * Math.PI) / 360) * margin)
}

export function zoomLevel(distance: number): number {
  return Math.round(Math.log(distance) / Math.log(ZOOM_STEP))
}

/**
 * Greedy clustering, most important first: each event joins the nearest
 * existing representative within `angle`, or becomes a representative itself.
 * `directions` holds unit xyz triples.
 */
export function clusterByAngle(directions: Float32Array, importance: ArrayLike<number>, angle: number): Cluster[] {
  const count = directions.length / 3
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => importance[b] - importance[a] || a - b)

  if (angle <= 0) {
    return order.map((i) => ({ representative: i, members: [i], spread: 0, maxImportance: importance[i] }))
  }

  const chord = 2 * Math.sin(Math.min(angle, Math.PI) / 2)
  const half = Math.ceil(1 / chord) + 1
  const span = 2 * half + 1
  const cellOf = (v: number) => Math.floor(v / chord) + half
  const grid = new Map<number, number[]>()
  const clusters: Cluster[] = []

  for (const i of order) {
    const x = directions[i * 3]
    const y = directions[i * 3 + 1]
    const z = directions[i * 3 + 2]
    const cx = cellOf(x)
    const cy = cellOf(y)
    const cz = cellOf(z)

    let best = -1
    let bestChord = chord
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = grid.get(((cx + dx) * span + (cy + dy)) * span + (cz + dz))
          if (!cell) continue
          for (const c of cell) {
            const r = clusters[c].representative
            const d = Math.hypot(x - directions[r * 3], y - directions[r * 3 + 1], z - directions[r * 3 + 2])
            if (d < bestChord) {
              bestChord = d
              best = c
            }
          }
        }
      }
    }

    if (best >= 0) {
      const cluster = clusters[best]
      cluster.members.push(i)
      cluster.spread = Math.max(cluster.spread, 2 * Math.asin(Math.min(1, bestChord / 2)))
    } else {
      const key = (cx * span + cy) * span + cz
      const cell = grid.get(key)
      if (cell) cell.push(clusters.length)
      else grid.set(key, [clusters.length])
      clusters.push({ representative: i, members: [i], spread: 0, maxImportance: importance[i] })
    }
  }
  return clusters
}

/** Clusters up to this size split fully in one step; bigger ones split in stages. */
const FULL_SPLIT_MAX_MEMBERS = 24

/**
 * The cluster angle at which this cluster breaks up: below the closest pair
 * of members for small clusters, a third of the spread for large ones.
 */
export function splitAngle(directions: Float32Array, cluster: Cluster): number {
  const m = cluster.members
  if (m.length < 2) return 0
  if (m.length > FULL_SPLIT_MAX_MEMBERS) return cluster.spread / 3

  let closestChord = Infinity
  for (let a = 0; a < m.length; a++) {
    for (let b = a + 1; b < m.length; b++) {
      const i = m[a] * 3
      const j = m[b] * 3
      closestChord = Math.min(
        closestChord,
        Math.hypot(directions[i] - directions[j], directions[i + 1] - directions[j + 1], directions[i + 2] - directions[j + 2]),
      )
    }
  }
  return 2 * Math.asin(Math.min(1, closestChord / 2))
}
