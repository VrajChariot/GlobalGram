/** Deterministic PRNG (mulberry32): floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal sample (Box–Muller). */
export function gaussian(random: () => number): number {
  const u = 1 - random()
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]
}

/** Picks an item with probability proportional to weight(item). */
export function pickWeighted<T>(random: () => number, items: readonly T[], weight: (item: T) => number): T {
  let total = 0
  for (const item of items) total += weight(item)
  let r = random() * total
  for (const item of items) {
    r -= weight(item)
    if (r < 0) return item
  }
  return items[items.length - 1]
}
