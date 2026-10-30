type Section = Record<string, number | string | boolean>
export type Range = { min: number; max: number; step?: number }

/**
 * Leva schema for a mutable config section: each control starts at the
 * section's value and writes changes straight back into it (transient, so
 * React never re-renders on slider drags).
 */
export function bindSection<T extends Section>(section: T, ranges: Partial<Record<keyof T, Range>> = {}) {
  return Object.fromEntries(
    Object.entries(section).map(([key, value]) => [
      key,
      {
        value,
        ...ranges[key as keyof T],
        onChange: (next: number | string | boolean) => {
          ;(section as Section)[key] = next
        },
      },
    ]),
  )
}
