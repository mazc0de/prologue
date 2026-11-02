import { Ellipsis, LogOut, Pencil, Pin, Trash } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useUserId } from '@/auth/AuthProvider'
import { ProjectStatusPill, RolePill } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormDialog } from '@/components/FormDialog'
import { FormError, SelectField, TextField } from '@/components/Field'
import { Markdown, MarkdownField } from '@/components/Markdown'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TagInput } from '@/components/TagInput'
import { notify } from '@/lib/notify'
import { useTogglePin } from '@/features/dashboard/queries'
import { errorMessage } from '@/lib/errors'
import { relativeTime } from '@/lib/format'
import { canEdit, capitalize, isOwner, PROJECT_STATUSES, type ProjectCard, type ProjectStatus } from '@/lib/types'
import { useDeleteProject, useRemoveMember, useUpdateProject } from './queries'

export function ProjectHeader({ project }: { project: ProjectCard }) {
  const editable = canEdit(project.my_role)
  const owner = isOwner(project.my_role)
  const userId = useUserId()
  const navigate = useNavigate()
  const togglePin = useTogglePin()
  const update = useUpdateProject(project.id)
  const remove = useDeleteProject()
  const leave = useRemoveMember(project.id)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const pinned = Boolean(project.pinned_at)

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="flex min-w-0 basis-full flex-col gap-1.5 sm:basis-0 sm:flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="min-w-0 text-2xl font-semibold tracking-[-0.01em] break-words">{project.name}</h1>
            {!editable && <ProjectStatusPill status={project.status} />}
            {!owner && <RolePill role={project.my_role} />}
          </div>
          <p className="data text-xs text-faint">last activity {relativeTime(project.last_activity_at)}</p>
        </div>

        <div className="flex items-center gap-1">
          {editable && (
            <StatusSelect
              value={project.status}
              onChange={(status) => update.mutate({ status }, { onError: notify.error })}
            />
          )}
          <Button variant="ghost" size="icon-sm"
            aria-label={pinned ? 'Unpin from dashboard' : 'Pin to top of dashboard'} title={pinned ? 'Unpin from dashboard' : 'Pin to top of dashboard'}
            aria-pressed={pinned}
            onClick={() => togglePin.mutate({ projectId: project.id, pinned: !pinned }, { onError: notify.error })}
            className={pinned ? 'text-foreground' : undefined}
          >
            <Pin size={16} strokeWidth={1.75} fill={pinned ? 'currentColor' : 'none'} />
          </Button>
          {editable && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={14} strokeWidth={1.75} /> Edit
            </Button>
          )}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More actions" title="More actions">
                <Ellipsis size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                {owner ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      setDeleting(true)
                    }}
                  >
                    <Trash size={14} strokeWidth={1.75} /> Delete Project
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      setLeaving(true)
                    }}
                  >
                    <LogOut size={14} strokeWidth={1.75} /> Leave Project
                  </DropdownMenuItem>
                )}
                {owner && (
                  <>
                    <DropdownMenuSeparator />
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      Prefer to keep it? Set it to Inactive to take it off your dashboard.
                    </p>
                  </>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {project.tech_tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tech Tags">
          {project.tech_tags.map((t) => (
            <li key={t} className="data inline-flex h-6 items-center rounded-sm border bg-card px-2 text-xs">
              {t}
            </li>
          ))}
        </ul>
      )}

      {editing && <EditProjectDialog project={project} onClose={() => setEditing(false)} />}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete Project"
        confirmLabel="Delete Project"
        typeToConfirm={project.name}
        body={
          <p>
            This permanently deletes <strong className="font-medium">{project.name}</strong> with its Repository,
            Environments, Releases, Board and Tasks for every Member. It can't be undone.
          </p>
        }
        onConfirm={async () => {
          await remove.mutateAsync(project.id)
          navigate('/', { replace: true })
        }}
      />

      <ConfirmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Leave Project"
        confirmLabel="Leave"
        body={
          <p>
            You'll lose access to <strong className="font-medium">{project.name}</strong>. Tasks assigned to you become
            unassigned. The Owner can invite you again.
          </p>
        }
        onConfirm={async () => {
          await leave.mutateAsync(userId)
          navigate('/', { replace: true })
        }}
      />
    </header>
  )
}

function StatusSelect({ value, onChange }: { value: ProjectStatus; onChange: (s: ProjectStatus) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ProjectStatus)}>
      <SelectTrigger size="sm" aria-label="Project Status" className="min-w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {PROJECT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            <ProjectStatusPill status={s} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function DescriptionBlock({ project, onEdit }: { project: ProjectCard; onEdit?: () => void }) {
  if (!project.description.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        No description yet.
        {onEdit && (
          <>
            {' '}
            <button type="button" onClick={onEdit} className="font-medium text-foreground underline-offset-2 hover:underline">
              Add one
            </button>
          </>
        )}
      </p>
    )
  }
  return <Markdown>{project.description}</Markdown>
}

export function EditProjectDialog({ project, onClose }: { project: ProjectCard; onClose: () => void }) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [tags, setTags] = useState(project.tech_tags)
  const update = useUpdateProject(project.id)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    update.mutate({ name: name.trim(), description, status, tech_tags: tags }, { onSuccess: onClose })
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Edit Project"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-project" loading={update.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form id="edit-project" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={update.error ? errorMessage(update.error) : null} />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <TextField label="Name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          <SelectField
            label="Project Status"
            value={status}
            onValueChange={setStatus}
            options={PROJECT_STATUSES.map((s) => ({ value: s, label: capitalize(s) }))}
          />
        </div>
        <MarkdownField label="Description" value={description} onChange={setDescription} rows={10} />
        <TagInput label="Tech Tags" value={tags} onChange={setTags} />
      </form>
    </FormDialog>
  )
}
