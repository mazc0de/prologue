import { cn } from '@/lib/utils'

/** Prologue mark: a "P" in a square ink-outline glyph. */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      className={cn('inline-flex flex-none items-center justify-center rounded-sm border border-foreground font-mono font-semibold', className)}
    >
      P
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em]', className)}>
      <LogoMark />
      Prologue
    </span>
  )
}
