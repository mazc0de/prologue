import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { FormDialog } from '@/components/FormDialog'
import { FormError, TextField } from '@/components/Field'
import { errorMessage } from '@/lib/errors'
import type { BoardColumn } from '@/lib/types'
import { useCreateColumn, useUpdateColumn } from './queries'

export function ColumnDialog({
  projectId,
  column,
  onClose,
}: {
  projectId: string
  column?: BoardColumn
  onClose: () => void
}) {
  const [name, setName] = useState(column?.name ?? '')
  const [isDone, setIsDone] = useState(column?.is_done ?? false)
  const create = useCreateColumn(projectId)
  const update = useUpdateColumn(projectId)
  const mutation = column ? update : create

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (column) update.mutate({ id: column.id, patch: { name: name.trim(), is_done: isDone } }, { onSuccess: onClose })
    else create.mutate({ name, isDone }, { onSuccess: onClose })
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title={column ? 'Edit Column' : 'Add Column'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="column-form" loading={mutation.isPending}>
            {column ? 'Save' : 'Add Column'}
          </Button>
        </>
      }
    >
      <form id="column-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={mutation.error ? errorMessage(mutation.error) : null} />
        <TextField label="Name" required maxLength={60} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        <Field orientation="horizontal" className="items-start">
          <Checkbox id="column-is-done" checked={isDone} onCheckedChange={(v) => setIsDone(v === true)} />
          <FieldContent>
            <FieldLabel htmlFor="column-is-done">Done Column</FieldLabel>
            <FieldDescription>Tasks here count as finished and drop out of the open count.</FieldDescription>
          </FieldContent>
        </Field>
      </form>
    </FormDialog>
  )
}
