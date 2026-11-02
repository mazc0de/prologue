import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { FormError, TextField } from './Field'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<unknown>
  /** When set, the user must type this text to enable the action. */
  typeToConfirm?: string
}

/** Destructive confirmation on shadcn AlertDialog; stays open and shows the error if the action fails. */
export function ConfirmDialog({ open, onClose, title, body, confirmLabel, onConfirm, typeToConfirm }: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blocked = typeToConfirm !== undefined && typed.trim() !== typeToConfirm.trim()

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) return
        setTyped('')
        setError(null)
        onClose()
      }}
    >
      <AlertDialogContent className="sm:max-w-[440px]">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">{body}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormError message={error} />
        {typeToConfirm !== undefined && (
          <TextField
            label={`Type "${typeToConfirm}" to confirm`}
            value={typed}
            autoFocus
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
          />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          {/* A plain Button, not AlertDialogAction: the dialog must stay open while the action runs. */}
          <Button variant="destructive" onClick={confirm} loading={busy} disabled={blocked}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
