import { Copy, Eye, EyeOff, Pencil, Plus, Trash, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormError, TextField } from '@/components/Field'
import { FormDialog } from '@/components/FormDialog'
import { BlockError } from '@/components/Loading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { copyText } from '@/lib/clipboard'
import { errorMessage } from '@/lib/errors'
import { notify } from '@/lib/notify'
import type { CredentialField, EnvironmentCredential } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCredentials, useDeleteCredential, useSaveCredential } from './queries'

/** What a new Credential starts with; every field can be renamed or removed. */
const DEFAULT_FIELDS = ['Merchant Code', 'CID', 'Username', 'Password']

const SECRET = /pass|secret|pin|token|key/i
const isSecret = (field: CredentialField) => SECRET.test(field.name)

/** Keeps password managers from offering to fill or save these fields. */
const NO_AUTOFILL = { autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': 'true' } as const

async function copy(text: string, what: string) {
  if (await copyText(text)) notify.success(`${what} copied`)
  else notify.error(new Error(`Couldn't copy ${what}.`))
}

/**
 * Test accounts for logging in to one Environment (Merchant Code, CID, Username, Password…).
 * Owners and Editors only. Each field copies on its own; "Copy all" copies `Name: value` lines.
 */
export function CredentialsDialog({
  projectId,
  environment,
  startAdding = false,
  onClose,
}: {
  projectId: string
  environment: { id: string; name: string }
  startAdding?: boolean
  onClose: () => void
}) {
  const credentials = useCredentials(environment.id)
  const [editing, setEditing] = useState<string | 'new' | null>(startAdding ? 'new' : null)
  const list = credentials.data ?? []

  return (
    <FormDialog
      open
      onClose={onClose}
      size="lg"
      title={`${environment.name} Credentials`}
      description="Test accounts for logging in. Only Owners and Editors can see these."
      footer={
        <>
          <Button variant="outline" className="sm:mr-auto" disabled={editing !== null} onClick={() => setEditing('new')}>
            <Plus size={14} strokeWidth={2} /> Add Credential
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {editing === 'new' && (
          <CredentialForm
            projectId={projectId}
            environmentId={environment.id}
            onDone={() => setEditing(null)}
          />
        )}
        {credentials.error ? (
          <BlockError message={`Couldn't load the Credentials. ${errorMessage(credentials.error)}`} onRetry={() => credentials.refetch()} />
        ) : credentials.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading Credentials…</p>
        ) : list.length === 0 && editing !== 'new' ? (
          <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
            No Credentials yet. Add the accounts you log in with when testing this Environment.
          </p>
        ) : (
          list.map((c) =>
            editing === c.id ? (
              <CredentialForm
                key={c.id}
                projectId={projectId}
                environmentId={environment.id}
                credential={c}
                onDone={() => setEditing(null)}
              />
            ) : (
              <CredentialCard
                key={c.id}
                projectId={projectId}
                credential={c}
                disabled={editing !== null}
                onEdit={() => setEditing(c.id)}
              />
            ),
          )
        )}
      </div>
    </FormDialog>
  )
}

function CredentialCard({
  projectId,
  credential,
  disabled,
  onEdit,
}: {
  projectId: string
  credential: EnvironmentCredential
  disabled: boolean
  onEdit: () => void
}) {
  const [shown, setShown] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const del = useDeleteCredential(projectId)
  const fields = credential.fields.filter((f) => f.name || f.value)
  const toggle = (i: number) =>
    setShown((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <article className="rounded-md border bg-card" aria-label={`Credential ${credential.label}`}>
      <header className="flex items-center gap-1 border-b border-border/60 py-1.5 pr-1.5 pl-4">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{credential.label}</h3>
        <Button
          variant="ghost"
          size="sm"
          disabled={!fields.length}
          onClick={() => copy(fields.map((f) => `${f.name}: ${f.value}`).join('\n'), credential.label)}
        >
          <Copy size={13} strokeWidth={1.75} /> Copy all
        </Button>
        <Button variant="ghost" size="icon-sm" className="size-7" disabled={disabled} aria-label={`Edit ${credential.label}`} title="Edit" onClick={onEdit}>
          <Pencil size={13} strokeWidth={1.75} />
        </Button>
        <Button variant="ghost" size="icon-sm" className="size-7" disabled={disabled} aria-label={`Delete ${credential.label}`} title="Delete" onClick={() => setDeleting(true)}>
          <Trash size={13} strokeWidth={1.75} />
        </Button>
      </header>

      {fields.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No fields.</p>
      ) : (
        <dl className="flex flex-col">
          {fields.map((f, i) => {
            const secret = isSecret(f)
            const visible = !secret || shown.has(i)
            return (
              <div
                key={i}
                className={cn('grid grid-cols-[minmax(0,120px)_minmax(0,1fr)_auto] items-center gap-3 py-1 pr-1.5 pl-4', i > 0 && 'border-t border-border/40')}
              >
                <dt className="truncate text-xs text-muted-foreground" title={f.name}>
                  {f.name || '—'}
                </dt>
                <dd className="data truncate text-sm" title={visible ? f.value : undefined}>
                  {f.value ? (visible ? f.value : '••••••••') : <span className="text-faint">empty</span>}
                </dd>
                <div className="flex items-center">
                  {secret && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      aria-pressed={visible}
                      aria-label={visible ? `Hide ${f.name}` : `Show ${f.name}`}
                      title={visible ? 'Hide' : 'Show'}
                      onClick={() => toggle(i)}
                    >
                      {visible ? <EyeOff size={13} /> : <Eye size={13} />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    disabled={!f.value}
                    aria-label={`Copy ${f.name}`}
                    title={`Copy ${f.name}`}
                    onClick={() => copy(f.value, f.name || 'Value')}
                  >
                    <Copy size={13} strokeWidth={1.75} />
                  </Button>
                </div>
              </div>
            )
          })}
        </dl>
      )}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete Credential"
        confirmLabel="Delete"
        body={
          <p>
            Delete <strong className="font-medium">{credential.label}</strong> and its {fields.length} field
            {fields.length === 1 ? '' : 's'}?
          </p>
        }
        onConfirm={() =>
          del
            .mutateAsync({ id: credential.id, environmentId: credential.environment_id })
            .then(() => notify.success(`${credential.label} deleted`))
        }
      />
    </article>
  )
}

interface FieldDraft extends CredentialField {
  key: number
}

let fieldKey = 0
const draft = (name = '', value = ''): FieldDraft => ({ key: fieldKey++, name, value })

function CredentialForm({
  projectId,
  environmentId,
  credential,
  onDone,
}: {
  projectId: string
  environmentId: string
  credential?: EnvironmentCredential
  onDone: () => void
}) {
  const [label, setLabel] = useState(credential?.label ?? '')
  const [fields, setFields] = useState<FieldDraft[]>(() =>
    credential ? credential.fields.map((f) => draft(f.name, f.value)) : DEFAULT_FIELDS.map((name) => draft(name)),
  )
  const [shown, setShown] = useState(!credential)
  const save = useSaveCredential(projectId)

  const update = (key: number, patch: Partial<CredentialField>) =>
    setFields((all) => all.map((f) => (f.key === key ? { ...f, ...patch } : f)))

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate(
      { id: credential?.id, environment_id: environmentId, label, fields: fields.map(({ name, value }) => ({ name, value })) },
      {
        onSuccess: () => {
          notify.success(credential ? `${label.trim()} saved` : `${label.trim()} added`)
          onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-md border bg-background p-4" aria-label={credential ? `Edit ${credential.label}` : 'New Credential'}>
      <FormError message={save.error ? errorMessage(save.error) : null} />
      <TextField
        label="Label"
        required
        maxLength={60}
        autoFocus
        placeholder="Merchant demo, Admin, Cashier…"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-medium">Fields</legend>
          <Button variant="ghost" size="xs" aria-pressed={shown} onClick={() => setShown((v) => !v)}>
            {shown ? <EyeOff /> : <Eye />} {shown ? 'Hide values' : 'Show values'}
          </Button>
        </div>
        {fields.map((f, i) => (
          <div key={f.key} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto] gap-2">
            <Input
              aria-label={`Field ${i + 1} name`}
              placeholder="Name"
              maxLength={40}
              value={f.name}
              onChange={(e) => update(f.key, { name: e.target.value })}
              {...NO_AUTOFILL}
            />
            <Input
              aria-label={`${f.name || `Field ${i + 1}`} value`}
              placeholder="Value"
              maxLength={500}
              type={!shown && isSecret(f) ? 'password' : 'text'}
              value={f.value}
              onChange={(e) => update(f.key, { value: e.target.value })}
              className="font-mono"
              {...NO_AUTOFILL}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${f.name || `field ${i + 1}`}`}
              title="Remove field"
              onClick={() => setFields((all) => all.filter((x) => x.key !== f.key))}
            >
              <X size={15} />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="ghost" className="self-start" disabled={fields.length >= 30} onClick={() => setFields((all) => [...all, draft()])}>
          <Plus size={14} strokeWidth={2} /> Add field
        </Button>
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {credential ? 'Save' : 'Add Credential'}
        </Button>
      </div>
    </form>
  )
}
