import { ExternalLink, Pencil, Plus, Trash } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/FormDialog'
import { FormError, TextField } from '@/components/Field'
import { BlockError } from '@/components/Loading'
import { usePlotPhase, useRevealKey } from '@/components/plot-reveal'
import { notify } from '@/lib/notify'
import { errorMessage } from '@/lib/errors'
import { hostOf, isHttpUrl } from '@/lib/format'
import type { QuickLink } from '@/lib/types'
import { useDeleteQuickLink, useQuickLinks, useSaveQuickLink } from './queries'
import { SectionHeader } from './SectionHeader'
import { sketchQuickLinks } from './sketch'

export function QuickLinksSection({ projectId, editable }: { projectId: string; editable: boolean }) {
  const query = useQuickLinks(projectId)
  // While the Project page is sketched, draw placeholder links; ProjectPage holds the reveal until these load.
  const sketch = usePlotPhase() === 'sketch'
  const revealKey = useRevealKey()
  const data = sketch ? sketchQuickLinks(projectId) : query.data
  const [editing, setEditing] = useState<QuickLink | 'new' | null>(null)
  const del = useDeleteQuickLink(projectId)

  return (
    <section aria-labelledby="links-heading" className="flex flex-col gap-3">
      <SectionHeader
        id="links-heading"
        title="Quick Links"
        count={data?.length}
        action={
          editable && (
            <Button size="sm" variant="ghost" onClick={() => setEditing('new')}>
              <Plus size={14} strokeWidth={2} /> Add
            </Button>
          )
        }
      />
      {query.error && !sketch ? (
        <BlockError message={`Couldn't load Quick Links. ${errorMessage(query.error)}`} onRetry={() => query.refetch()} />
      ) : !data ? null : data.length === 0 ? (
        <p className="rounded-md border border-dashed bg-card px-4 py-2.5 text-sm text-muted-foreground">
          Design files, API docs, dashboards: anything that isn't a Repository or Environment.
        </p>
      ) : (
        <ul className="flex flex-col rounded-md border bg-card">
          {data.map((link, i) => (
            <li key={revealKey(link.id, i)} className={i ? 'border-t border-border/60' : undefined}>
              <div className="group flex items-center gap-2 py-1 pr-1.5 pl-4">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex min-w-0 flex-1 flex-col py-1.5 hover:text-primary"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{link.label}</span>
                    <ExternalLink size={12} className="flex-none text-muted-foreground" aria-hidden />
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{hostOf(link.url)}</span>
                </a>
                {editable && (
                  <div className="flex flex-none gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${link.label}`} title={`Edit ${link.label}`} className="size-7" onClick={() => setEditing(link)}>
                      <Pencil size={13} strokeWidth={1.75} />
                    </Button>
                    <Button variant="ghost" size="icon-sm"
                      aria-label={`Delete ${link.label}`} title={`Delete ${link.label}`}
                      className="size-7"
                      onClick={() =>
                        del.mutate(link.id, { onSuccess: () => notify.success(`${link.label} deleted`), onError: notify.error })
                      }
                    >
                      <Trash size={13} strokeWidth={1.75} />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <QuickLinkDialog
          projectId={projectId}
          link={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

function QuickLinkDialog({ projectId, link, onClose }: { projectId: string; link?: QuickLink; onClose: () => void }) {
  const [label, setLabel] = useState(link?.label ?? '')
  const [url, setUrl] = useState(link?.url ?? '')
  const [urlError, setUrlError] = useState<string | null>(null)
  const save = useSaveQuickLink(projectId)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isHttpUrl(url)) {
      setUrlError('Use a full URL starting with https://')
      return
    }
    save.mutate(
      { id: link?.id, label, url },
      {
        onSuccess: () => {
          notify.success(link ? 'Quick Link saved' : 'Quick Link added')
          onClose()
        },
      },
    )
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title={link ? 'Edit Quick Link' : 'Add Quick Link'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="link-form" loading={save.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form id="link-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={save.error ? errorMessage(save.error) : null} />
        <TextField
          label="Label"
          required
          maxLength={80}
          autoFocus
          placeholder="Figma, API docs…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <TextField
          label="URL"
          type="url"
          required
          placeholder="https://"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setUrlError(null)
          }}
          error={urlError}
        />
      </form>
    </FormDialog>
  )
}
