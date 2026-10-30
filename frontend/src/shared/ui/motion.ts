const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

/** True when the user asked the OS for less motion. */
export function prefersReducedMotion(): boolean {
  return query?.matches ?? false
}
