import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface FormDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const widths = { sm: 'sm:max-w-[420px]', md: 'sm:max-w-[560px]', lg: 'sm:max-w-[760px]' }

/**
 * The app's standard modal: shadcn Dialog with a fixed header and footer and a scrolling body.
 * Callers mount it only while open (`{editing && <FormDialog open …/>}`), so state resets each time.
 */
export function FormDialog({ open, onClose, title, description, children, footer, size = 'md' }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn('flex max-h-[calc(100dvh-32px)] flex-col gap-0 overflow-hidden p-0', widths[size])}>
        <DialogHeader className="px-6 pt-6 pb-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <DialogFooter className="border-t px-6 py-4">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
