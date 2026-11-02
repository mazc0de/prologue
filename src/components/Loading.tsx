import { AlertCircle, Loader2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PlotReveal, usePlotPhase } from '@/components/plot-reveal'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function FullScreenLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <span className="sr-only">Loading</span>
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
    </div>
  )
}

/**
 * The first load of a view, drawn in blue pencil (LOADING_DESIGN.md). `children(sketch)` renders the real UI:
 * from placeholder data while `sketch` is true, from the fetched data once it is false. The pencil traces the
 * placeholder, holds (breathing) until `pending` clears, morphs to the real layout while numbers count up, then
 * the real UI fills in element by element.
 *
 * It plays only when the data wasn't there at mount: cached data and background refetches render straight away.
 * Render errors and not-found states outside it, so a failed load drops the drawing at once.
 * Lists inside key their rows with `useRevealKey` so the sketch rows morph into the real ones.
 */
export function LoadingReveal({
  pending,
  className,
  children,
}: {
  pending: boolean
  className?: string
  children: (sketch: boolean) => ReactNode
}) {
  const [plays] = useState(pending)
  if (!plays) return <div className={className}>{children(false)}</div>
  return (
    <PlotReveal ready={!pending} morph annotate={false}>
      <Phase className={className}>{children}</Phase>
    </PlotReveal>
  )
}

function Phase({ className, children }: { className?: string; children: (sketch: boolean) => ReactNode }) {
  const sketch = usePlotPhase() === 'sketch'
  // The placeholder UI is invisible under the pencil: keep it out of reach of clicks, focus and screen readers.
  return (
    <div className={className} inert={sketch} aria-busy={sketch}>
      {children(sketch)}
    </div>
  )
}

/** Placeholder block while a value loads (shadcn Skeleton). */
export function Bar({ className }: { className?: string }) {
  return <Skeleton aria-hidden className={cn('rounded-sm', className)} />
}

export function BlockError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive" className="flex items-center border-destructive/30 bg-destructive-soft [&>svg]:translate-y-0">
      <AlertCircle />
      <AlertDescription className="flex-1 text-destructive-soft-foreground">{message}</AlertDescription>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="ml-3">
          Retry
        </Button>
      )}
    </Alert>
  )
}
