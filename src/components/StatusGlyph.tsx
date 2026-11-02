import { cn } from '@/lib/utils'

/**
 * The ink status vocabulary (DESIGN.md): states are drawn as glyphs, never colour.
 * filled = live / Active / Production · half = in between (Staging) · empty = not live (Development)
 * dashed = set aside (Inactive, Preview) · failed = the only red glyph (overdue, errors).
 */
export type Glyph = 'filled' | 'half' | 'empty' | 'dashed' | 'failed'

export function StatusGlyph({ kind, size = 12, className, label }: { kind: Glyph; size?: number; className?: string; label?: string }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className={cn('flex-none', kind === 'failed' ? 'text-destructive' : 'text-foreground', className)}
      {...a11y}
    >
      {kind === 'filled' && <circle cx="6" cy="6" r="5" fill="currentColor" />}
      {kind === 'half' && (
        <>
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.5a4.5 4.5 0 0 1 0 9z" fill="currentColor" />
        </>
      )}
      {kind === 'empty' && <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {kind === 'dashed' && (
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 1.8" opacity="0.7" />
      )}
      {kind === 'failed' && (
        <>
          <circle cx="6" cy="6" r="5.5" fill="currentColor" />
          <path d="M4 4l4 4M8 4l-4 4" stroke="var(--card)" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
