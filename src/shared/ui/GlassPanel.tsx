import type { ReactNode, Ref } from 'react'

type GlassPanelProps = {
  children: ReactNode
  className?: string
  ref?: Ref<HTMLDivElement>
}

/** Holographic glass: blurred backdrop, dark teal tint, 1px cyan border at 40%, faint scanlines. */
export function GlassPanel({ children, className = '', ref }: GlassPanelProps) {
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-lg border border-[#3FE0FF]/40 bg-[rgba(10,30,40,0.35)] shadow-[0_0_24px_rgba(63,224,255,0.12)] backdrop-blur-[12px] ${className}`}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(230,252,255,0.05)_0px,rgba(230,252,255,0.05)_1px,transparent_1px,transparent_3px)]"
      />
    </div>
  )
}
