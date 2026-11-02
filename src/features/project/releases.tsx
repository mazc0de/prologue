import { Pencil, Trash } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormDialog } from '@/components/FormDialog'
import { FormError, TextField } from '@/components/Field'
import { BlockError, LoadingReveal } from '@/components/Loading'
import { useRevealKey } from '@/components/plot-reveal'
import { Markdown, MarkdownField } from '@/components/Markdown'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime, isoToLocalInput, localInputToISO } from '@/lib/format'
import type { Environment, Release } from '@/lib/types'
import { useDeleteRelease, useReleases, useSaveRelease } from './queries'
import { sketchReleases } from './sketch'

/** "Bump version" = record a Release (ADR 0002). Also used to edit one. */
export function ReleaseDialog({
  projectId,
  environment,
  currentVersion,
  release,
  onClose,
}: {
  projectId: string
  environment: Pick<Environment, 'id' | 'name'>
  currentVersion?: string
  release?: Release
  onClose: () => void
}) {
  const [version, setVersion] = useState(release?.version ?? '')
  const [notes, setNotes] = useState(release?.notes ?? '')
  const [releasedAt, setReleasedAt] = useState(() => isoToLocalInput(release?.released_at ?? new Date().toISOString()))
  const save = useSaveRelease(projectId)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate(
      {
        id: release?.id,
        environment_id: environment.id,
        version,
        notes,
        released_at: localInputToISO(releasedAt),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title={release ? `Edit Release ${release.version}` : `New Release to ${environment.name}`}
      description={
        release
          ? 'Fixing the latest Release also fixes the Version shown for this Environment.'
          : currentVersion
            ? `Currently running ${currentVersion}. The new Release becomes the Version if it is the latest.`
            : 'This becomes the Environment’s first Version.'
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="release-form" loading={save.isPending}>
            {release ? 'Save' : 'Record Release'}
          </Button>
        </>
      }
    >
      <form id="release-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={save.error ? errorMessage(save.error) : null} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Version"
            required
            maxLength={60}
            autoFocus
            placeholder={currentVersion ? `After ${currentVersion}` : '1.0.0'}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="font-mono"
            hint="Free text, e.g. 1.4.0 or 1.2.0 (45)."
          />
          <TextField
            label="Released at"
            type="datetime-local"
            required
            value={releasedAt}
            onChange={(e) => setReleasedAt(e.target.value)}
            hint="Backdate it if it shipped earlier."
          />
        </div>
        <MarkdownField label="Notes" value={notes} onChange={setNotes} rows={8} placeholder="What changed in this Release?" />
      </form>
    </FormDialog>
  )
}

type ReleaseWithAuthor = Release & { author: { display_name: string } | null }

export function ReleaseHistory({
  environmentId,
  projectId,
  editable,
}: {
  environmentId: string
  projectId: string
  editable: boolean
}) {
  const { data, isPending, error, refetch } = useReleases(environmentId)
  const [editing, setEditing] = useState<Release | null>(null)
  const [deleting, setDeleting] = useState<Release | null>(null)
  const del = useDeleteRelease(projectId)

  if (error) return <BlockError message={`Couldn't load releases. ${errorMessage(error)}`} onRetry={() => refetch()} />

  return (
    <>
      {/* First open: the history is sketched in pencil from placeholder Releases until it loads. */}
      <LoadingReveal pending={isPending}>
        {(sketch) => (
          <ReleaseList
            releases={sketch ? sketchReleases(projectId, environmentId) : ((data ?? []) as ReleaseWithAuthor[])}
            editable={editable}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        )}
      </LoadingReveal>

      {editing && (
        <ReleaseDialog
          projectId={projectId}
          environment={{ id: environmentId, name: '' }}
          release={editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete Release"
        confirmLabel="Delete"
        body={
          <p>
            Delete Release <strong className="font-mono font-medium">{deleting?.version}</strong>? If it is the latest, the
            Environment’s Version falls back to the one before it.
          </p>
        }
        onConfirm={() => del.mutateAsync({ id: deleting!.id, environmentId })}
      />
    </>
  )
}

function ReleaseList({
  releases,
  editable,
  onEdit,
  onDelete,
}: {
  releases: ReleaseWithAuthor[]
  editable: boolean
  onEdit: (release: Release) => void
  onDelete: (release: Release) => void
}) {
  const revealKey = useRevealKey()
  if (releases.length === 0) return <p className="text-sm text-muted-foreground">No Releases recorded yet.</p>

  return (
    <ol className="flex flex-col gap-4" aria-label="Release history">
      {releases.map((r, i) => (
        <li key={revealKey(r.id, i)} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
          <div className="flex flex-col">
            <span className="truncate font-mono text-sm font-medium" title={r.version}>
              {r.version}
            </span>
            <span className="text-xs text-muted-foreground" title={formatDateTime(r.released_at)}>
              {formatDate(r.released_at)}
              {i === 0 && ' · current'}
            </span>
          </div>
          <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            {r.notes.trim() ? (
              <Markdown className="prose-p:my-1">{r.notes}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">No notes.</p>
            )}
            {r.author && <p className="mt-1 text-xs text-muted-foreground">Recorded by {r.author.display_name}</p>}
          </div>
          {editable && (
            <div className="col-start-2 row-start-1 flex gap-0.5 sm:col-start-3">
              <Button variant="ghost" size="icon-sm" aria-label={`Edit Release ${r.version}`} title={`Edit Release ${r.version}`} className="size-7" onClick={() => onEdit(r)}>
                <Pencil size={13} strokeWidth={1.75} />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete Release ${r.version}`} title={`Delete Release ${r.version}`} className="size-7" onClick={() => onDelete(r)}>
                <Trash size={13} strokeWidth={1.75} />
              </Button>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
