import { cn } from '@/lib/utils'

/** A Project's mark: its initial in a square ink-outline glyph. */
export function ProjectMark({ id: _id, name, size = 40, className }: { id: string; name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      className={cn('inline-flex flex-none items-center justify-center rounded-sm border border-foreground/70 bg-card font-mono font-semibold select-none', className)}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
