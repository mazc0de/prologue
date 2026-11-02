import { Check, Trash } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Avatar } from '@/components/Avatar'
import { DatePicker } from '@/components/DatePicker'
import { LABEL_STYLE, LabelChip, PriorityMark } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormDialog } from '@/components/FormDialog'
import { FormError, SelectField, TextField } from '@/components/Field'
import { Markdown, MarkdownField } from '@/components/Markdown'
import type { MemberRow } from '@/features/project/queries'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'
import { formatDateTime, formatDueDate } from '@/lib/format'
import { positionAfterLast } from '@/lib/position'
import { queryKeys } from '@/lib/queryKeys'
import { TASK_PRIORITIES, type BoardColumn, type Label, type LabelColor, type TaskPriority } from '@/lib/types'
import {
  useDeleteTask,
  useMoveTask,
  useSetTaskLabels,
  useUpdateTask,
  type BoardData,
  type BoardTask,
  type TaskPatch,
} from './queries'

interface Props {
  projectId: string
  task: BoardTask
  columns: BoardColumn[]
  labels: Label[]
  members: MemberRow[]
  editable: boolean
  onClose: () => void
}

export function TaskDialog(props: Props) {
  return props.editable ? <EditTask {...props} /> : <ViewTask {...props} />
}

function ViewTask({ task, columns, labels, members, onClose }: Props) {
  const column = columns.find((c) => c.id === task.column_id)
  const assignee = members.find((m) => m.user_id === task.assignee_id)
  const taskLabels = labels.filter((l) => task.task_labels.some((tl) => tl.label_id === l.id))
  return (
    <FormDialog open onClose={onClose} title={task.title} size="lg">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_200px]">
        <div className="min-w-0">
          {task.description.trim() ? <Markdown>{task.description}</Markdown> : <p className="text-sm text-muted-foreground">No description.</p>}
        </div>
        <dl className="grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-3 text-sm md:grid-cols-1 md:gap-y-1">
          <Meta term="Column">{column?.name ?? '—'}</Meta>
          <Meta term="Priority">
            <PriorityMark priority={task.priority} withLabel />
          </Meta>
          <Meta term="Due date">{task.due_date ? formatDueDate(task.due_date) : <span className="text-muted-foreground">—</span>}</Meta>
          <Meta term="Assignee">
            {assignee ? (
              <span className="flex items-center gap-2">
                <Avatar userId={assignee.user_id} name={assignee.profile?.display_name ?? '?'} size={20} />
                {assignee.profile?.display_name}
              </span>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </Meta>
          <Meta term="Labels">
            {taskLabels.length ? (
              <span className="flex flex-wrap gap-1">
                {taskLabels.map((l) => (
                  <LabelChip key={l.id} name={l.name} color={l.color} />
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Meta>
        </dl>
      </div>
    </FormDialog>
  )
}

function Meta({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-xs text-muted-foreground md:mt-3 md:first:mt-0">{term}</dt>
      <dd>{children}</dd>
    </>
  )
}

function EditTask({ projectId, task, columns, labels, members, onClose }: Props) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? '')
  const [columnId, setColumnId] = useState(task.column_id)
  const [labelIds, setLabelIds] = useState<string[]>(task.task_labels.map((tl) => tl.label_id))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const update = useUpdateTask(projectId)
  const move = useMoveTask(projectId)
  const setLabels = useSetTaskLabels(projectId)
  const del = useDeleteTask(projectId)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const patch: TaskPatch = {}
      if (title.trim() !== task.title) patch.title = title.trim()
      if (description !== task.description) patch.description = description
      if (priority !== task.priority) patch.priority = priority
      if ((dueDate || null) !== task.due_date) patch.due_date = dueDate || null
      if ((assigneeId || null) !== task.assignee_id) patch.assignee_id = assigneeId || null
      if (Object.keys(patch).length) await update.mutateAsync({ id: task.id, patch })

      if (columnId !== task.column_id) {
        const data = queryClient.getQueryData<BoardData>(queryKeys.board(projectId))
        const inTarget = data?.tasks.filter((t) => t.column_id === columnId).map((t) => t.position) ?? []
        await move.mutateAsync({ id: task.id, columnId, position: positionAfterLast(inTarget) })
      }

      const before = task.task_labels.map((tl) => tl.label_id).sort().join()
      if ([...labelIds].sort().join() !== before) await setLabels.mutateAsync({ taskId: task.id, labelIds })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleLabel = (id: string) =>
    setLabelIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Task"
      description={`Created ${formatDateTime(task.created_at)}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" className="text-destructive hover:text-destructive mr-auto" onClick={() => setDeleting(true)}>
            <Trash size={14} strokeWidth={1.75} /> Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={onSubmit} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex min-w-0 flex-col gap-4">
          <FormError message={error} />
          <TextField label="Title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          <MarkdownField label="Description" value={description} onChange={setDescription} rows={10} />
        </div>
        <div className="flex flex-col gap-4">
          <SelectField
            label="Column"
            value={columnId}
            onValueChange={setColumnId}
            options={columns.map((c) => ({ value: c.id, label: `${c.name}${c.is_done ? ' (Done)' : ''}` }))}
          />
          <SelectField<TaskPriority>
            label="Priority"
            value={priority}
            onValueChange={setPriority}
            options={TASK_PRIORITIES.map((p) => ({ value: p, label: <PriorityMark priority={p} withLabel /> }))}
          />
          {/* Radix Select can't hold an empty value, so "none" stands for Unassigned. */}
          <SelectField
            label="Assignee"
            value={assigneeId || 'none'}
            onValueChange={(v) => setAssigneeId(v === 'none' ? '' : v)}
            options={[
              { value: 'none', label: 'Unassigned' },
              ...members.map((m) => ({
                value: m.user_id,
                label: (
                  <span className="flex items-center gap-2">
                    <Avatar userId={m.user_id} name={m.profile?.display_name ?? 'Unknown'} size={20} />
                    {m.profile?.display_name ?? 'Unknown'}
                  </span>
                ),
              })),
            ]}
          />
          <DatePicker label="Due date" value={dueDate} onChange={setDueDate} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Labels</legend>
            {labels.length === 0 ? (
              <p className="text-xs text-muted-foreground">No Labels yet. Create them from Labels above the Board.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {labels.map((l) => {
                  const on = labelIds.includes(l.id)
                  const style = LABEL_STYLE[l.color as LabelColor] ?? LABEL_STYLE.gray
                  return (
                    <button
                      key={l.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleLabel(l.id)}
                      className={cn(
                        'inline-flex h-7 items-center gap-1.5 rounded-sm border px-2 text-xs font-medium transition-colors',
                        on ? 'border-foreground bg-card text-foreground' : 'text-muted-foreground hover:border-input hover:text-foreground',
                      )}
                    >
                      {on ? (
                        <Check size={12} strokeWidth={2.25} />
                      ) : (
                        <span aria-hidden className="size-1.5 rounded-full" style={{ background: style.dot }} />
                      )}
                      {l.name}
                    </button>
                  )
                })}
              </div>
            )}
          </fieldset>
        </div>
      </form>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete Task"
        confirmLabel="Delete"
        body={
          <p>
            Delete <strong className="font-medium">{task.title}</strong>? This can't be undone.
          </p>
        }
        onConfirm={async () => {
          await del.mutateAsync(task.id)
          onClose()
        }}
      />
    </FormDialog>
  )
}
