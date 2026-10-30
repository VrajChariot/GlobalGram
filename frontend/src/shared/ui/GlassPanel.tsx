import type { ReactNode, Ref } from 'react'

type GlassPanelProps = {
  children: ReactNode
  className?: string
  ref?: Ref<HTMLDivElement>
}

/** Projected glass: deep ink tint, moderate blur so text stays legible over the room. */
export function GlassPanel({ children, className = '', ref }: GlassPanelProps) {
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-xl border border-hairline bg-ink backdrop-blur-[12px] ${className}`}
    >
      {children}
    </div>
  )
}
