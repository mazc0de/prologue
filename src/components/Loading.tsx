import { AlertCircle, Loader2 } from 'lucide-react'
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
