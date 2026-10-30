import { describe, expect, it } from 'vitest'
import { latLngToVector } from '../geo/latLngToVector'
import { mulberry32 } from '../math/random'
import { angularRadiusForPixels, clusterByAngle, distanceToSplit, splitAngle, zoomLevel } from './screenClusters'

const DEG = Math.PI / 180

function directionsOf(points: [number, number][]): Float32Array {
  const out = new Float32Array(points.length * 3)
  points.forEach(([lat, lng], i) => {
    const v = latLngToVector(lat, lng)
    out.set([v.x, v.y, v.z], i * 3)
  })
  return out
}

describe('clusterByAngle', () => {
  const points: [number, number][] = [
    [10, 10],
    [10.5, 10.2],
    [-40, 120],
  ]
  const importance = [0.2, 0.9, 0.5]

  it('keeps every event separate at angle 0', () => {
    expect(clusterByAngle(directionsOf(points), importance, 0)).toHaveLength(3)
  })

  it('merges nearby events under the most important one', () => {
    const clusters = clusterByAngle(directionsOf(points), importance, 2 * DEG)
    expect(clusters).toHaveLength(2)
    const pair = clusters.find((c) => c.members.length === 2)!
    expect(pair.representative).toBe(1)
    expect(pair.maxImportance).toBe(0.9)
    expect(pair.spread / DEG).toBeCloseTo(0.535, 1)
  })

  it('collapses everything at a huge angle', () => {
    expect(clusterByAngle(directionsOf(points), importance, Math.PI)).toHaveLength(1)
  })

  it('assigns every event to exactly one cluster, within the angle of its representative', () => {
    const random = mulberry32(42)
    const pts: [number, number][] = Array.from({ length: 1500 }, () => [random() * 140 - 70, random() * 360 - 180])
    const imp = pts.map(() => random())
    const dirs = directionsOf(pts)
    const angle = 3 * DEG
    const clusters = clusterByAngle(dirs, imp, angle)

    const seen = new Set<number>()
    for (const c of clusters) {
      for (const m of c.members) {
        expect(seen.has(m)).toBe(false)
        seen.add(m)
        const r = c.representative
        const dot = dirs[m * 3] * dirs[r * 3] + dirs[m * 3 + 1] * dirs[r * 3 + 1] + dirs[m * 3 + 2] * dirs[r * 3 + 2]
        expect(Math.acos(Math.min(1, dot))).toBeLessThan(angle + 1e-6)
        expect(imp[m]).toBeLessThanOrEqual(imp[r])
      }
    }
    expect(seen.size).toBe(1500)
  })

  it('never leaves two representatives within the angle of each other', () => {
    const random = mulberry32(9)
    const pts: [number, number][] = Array.from({ length: 800 }, () => [random() * 20, random() * 20])
    const dirs = directionsOf(pts)
    const angle = 1.5 * DEG
    const reps = clusterByAngle(dirs, pts.map(() => random()), angle).map((c) => c.representative)
    for (let a = 0; a < reps.length; a++) {
      for (let b = a + 1; b < reps.length; b++) {
        const [i, j] = [reps[a], reps[b]]
        const dot = dirs[i * 3] * dirs[j * 3] + dirs[i * 3 + 1] * dirs[j * 3 + 1] + dirs[i * 3 + 2] * dirs[j * 3 + 2]
        expect(Math.acos(Math.min(1, dot))).toBeGreaterThanOrEqual(angle - 1e-6)
      }
    }
  })
})

describe('zoom helpers', () => {
  it('shrinks the cluster angle as the camera moves in', () => {
    expect(angularRadiusForPixels(26, 1.6, 45, 720)).toBeLessThan(angularRadiusForPixels(26, 3, 45, 720))
  })

  it('distanceToSplit lands where the cluster angle is below the spread', () => {
    const spread = 2 * DEG
    const d = distanceToSplit(spread, 26, 45, 720)
    expect(angularRadiusForPixels(26, d, 45, 720)).toBeLessThan(spread)
    expect(angularRadiusForPixels(26, d * 1.3, 45, 720)).toBeGreaterThan(spread)
  })

  it('quantises distance into 4% steps', () => {
    expect(zoomLevel(2.8)).toBe(zoomLevel(2.81))
    expect(zoomLevel(2.8)).not.toBe(zoomLevel(2.8 * 1.05))
  })
})

describe('splitAngle', () => {
  it('targets the closest pair in a small cluster so it splits fully', () => {
    const dirs = directionsOf([[0, 0], [0, 2], [0, 0.5]])
    const [cluster] = clusterByAngle(dirs, [1, 0.5, 0.2], 5 * DEG)
    expect(cluster.members).toHaveLength(3)
    expect(splitAngle(dirs, cluster) / DEG).toBeCloseTo(0.5, 3)
    // Re-clustering just below that angle leaves every event on its own.
    expect(clusterByAngle(dirs, [1, 0.5, 0.2], splitAngle(dirs, cluster) * 0.99)).toHaveLength(3)
  })

  it('splits large clusters in stages', () => {
    const random = mulberry32(5)
    const pts: [number, number][] = Array.from({ length: 60 }, () => [random() * 4, random() * 4])
    const dirs = directionsOf(pts)
    const [cluster] = clusterByAngle(dirs, pts.map(() => random()), 20 * DEG)
    expect(splitAngle(dirs, cluster)).toBeCloseTo(cluster.spread / 3)
  })

  it('is 0 for a single event', () => {
    const dirs = directionsOf([[0, 0]])
    expect(splitAngle(dirs, clusterByAngle(dirs, [1], DEG)[0])).toBe(0)
  })
})
