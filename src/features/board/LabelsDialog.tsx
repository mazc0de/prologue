import { Pencil, Trash } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { LABEL_STYLE, LabelChip } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/FormDialog'
import { FormError } from '@/components/Field'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'
import { capitalize, LABEL_COLORS, type Label, type LabelColor } from '@/lib/types'
import { useDeleteLabel, useLabels, useSaveLabel } from './queries'

export function LabelsDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { data: labels = [] } = useLabels(projectId)
  const [editing, setEditing] = useState<Label | null>(null)
  const del = useDeleteLabel(projectId)

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Labels"
      description="Labels belong to this Project and group its Tasks."
      footer={
        <Button onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <LabelForm key={editing?.id ?? 'new'} projectId={projectId} label={editing ?? undefined} onSaved={() => setEditing(null)} />
        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Labels yet.</p>
        ) : (
          <ul className="flex flex-col rounded-md border bg-card">
            {labels.map((l, i) => (
              <li key={l.id} className={cn('flex items-center gap-2 py-1.5 pr-1.5 pl-4', i > 0 && 'border-t border-border/60')}>
                <LabelChip name={l.name} color={l.color} />
                <span className="ml-auto" />
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${l.name}`} title={`Edit ${l.name}`} className="size-7" onClick={() => setEditing(l)}>
                  <Pencil size={13} strokeWidth={1.75} />
                </Button>
                <Button variant="ghost" size="icon-sm"
                  aria-label={`Delete ${l.name}`} title={`Delete ${l.name}`}
                  className="size-7"
                  onClick={() => del.mutate(l.id, { onSuccess: () => notify.success(`Label ${l.name} deleted`), onError: notify.error })}
                >
                  <Trash size={13} strokeWidth={1.75} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormDialog>
  )
}

function LabelForm({ projectId, label, onSaved }: { projectId: string; label?: Label; onSaved: () => void }) {
  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState<LabelColor>((label?.color as LabelColor) ?? 'blue')
  const save = useSaveLabel(projectId)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    save.mutate(
      { id: label?.id, name, color },
      {
        onSuccess: () => {
          notify.success(label ? `Label ${name.trim()} saved` : `Label ${name.trim()} added`)
          setName('')
          onSaved()
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-md border bg-background p-4">
      <FormError message={save.error ? errorMessage(save.error) : null} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="label-name">
          Label name
        </label>
        <Input
          id="label-name"
          required
          maxLength={40}
          placeholder={label ? 'Label name' : 'New Label, e.g. bug'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          
        />
        <Button type="submit" className="h-9" loading={save.isPending}>
          {label ? 'Save' : 'Add'}
        </Button>
      </div>
      <fieldset className="flex flex-wrap gap-1.5">
        <legend className="sr-only">Colour</legend>
        {LABEL_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={color === c}
            aria-label={capitalize(c)}
            title={capitalize(c)}
            onClick={() => setColor(c)}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-sm border bg-card transition-colors hover:border-input',
              color === c && 'border-foreground',
            )}
          >
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: LABEL_STYLE[c].dot }} />
          </button>
        ))}
      </fieldset>
    </form>
  )
}
