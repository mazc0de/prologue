import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowLeft, ArrowRight, CircleCheck, Ellipsis, Pencil, Plus, Trash } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { StatusGlyph } from '@/components/StatusGlyph'
import { useRevealKey } from '@/components/plot-reveal'
import { FormDialog } from '@/components/FormDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { positionBetween } from '@/lib/position'
import type { BoardColumn, Label } from '@/lib/types'
import { ColumnDialog } from './ColumnDialog'
import { useCreateTask, useDeleteColumn, useUpdateColumn, type BoardTask } from './queries'
import { SortableTask } from './TaskItem'

export const COLUMN_PREFIX = 'column:'

interface Props {
  projectId: string
  column: BoardColumn
  prevColumn?: BoardColumn
  prevPrevColumn?: BoardColumn
  nextColumn?: BoardColumn
  nextNextColumn?: BoardColumn
  tasks: BoardTask[]
  editable: boolean
  labelById: Map<string, Label>
  memberById: Map<string, string>
  onOpenTask: (id: string) => void
  draggingId: string | null
}

export function BoardColumnView({
  projectId,
  column,
  prevColumn,
  prevPrevColumn,
  nextColumn,
  nextNextColumn,
  tasks,
  editable,
  labelById,
  memberById,
  onOpenTask,
  draggingId,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}${column.id}`, disabled: !editable })
  const update = useUpdateColumn(projectId)
  const del = useDeleteColumn(projectId)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [adding, setAdding] = useState(false)
  const headingId = `col-${column.id}`
  const revealKey = useRevealKey()

  return (
    <li
      aria-labelledby={headingId}
      className={cn(
        'flex max-h-[calc(100dvh-160px)] w-[288px] flex-none flex-col rounded-md border bg-background transition-colors',
        isOver && 'bg-accent',
      )}
    >
      <div className="flex h-11 flex-none items-center gap-2 pr-1.5 pl-3">
        <h3 id={headingId} className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          {column.is_done && (
            <span title="Done Column" className="flex flex-none">
              <StatusGlyph kind="filled" size={10} />
            </span>
          )}
          <span className="truncate">{column.name}</span>
          {column.is_done && <span className="sr-only">(Done Column)</span>}
        </h3>
        <span className="data text-xs text-faint">{tasks.length}</span>
        {editable && (
          <div className="ml-auto flex items-center">
            <Button variant="ghost" size="icon-sm" aria-label={`Add Task to ${column.name}`} title={`Add Task to ${column.name}`} className="size-7" onClick={() => setAdding(true)}>
              <Plus size={15} />
            </Button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${column.name}`} title={`Actions for ${column.name}`} className="size-7">
                  <Ellipsis size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onSelect={() => setRenaming(true)}>
                    <Pencil size={14} strokeWidth={1.75} className="text-muted-foreground" /> Edit Column
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      update.mutate(
                        { id: column.id, patch: { is_done: !column.is_done } },
                        {
                          onSuccess: () =>
                            notify.success(column.is_done ? `${column.name} is no longer the Done Column` : `${column.name} is now the Done Column`),
                          onError: notify.error,
                        },
                      )
                    }}
                  >
                    <CircleCheck size={14} strokeWidth={1.75} className="text-muted-foreground" />
                    {column.is_done ? 'Unmark as Done Column' : 'Mark as Done Column'}
                  </DropdownMenuItem>
                  {(prevColumn || nextColumn) && <DropdownMenuSeparator />}
                  {prevColumn && (
                    <DropdownMenuItem
                      onSelect={() => {
                        update.mutate(
                          {
                            id: column.id,
                            patch: { position: positionBetween(prevPrevColumn?.position, prevColumn.position) },
                          },
                          { onSuccess: () => notify.success(`${column.name} moved left`), onError: notify.error },
                        )
                      }}
                    >
                      <ArrowLeft size={14} strokeWidth={1.75} className="text-muted-foreground" /> Move left
                    </DropdownMenuItem>
                  )}
                  {nextColumn && (
                    <DropdownMenuItem
                      onSelect={() => {
                        update.mutate(
                          {
                            id: column.id,
                            patch: { position: positionBetween(nextColumn.position, nextNextColumn?.position) },
                          },
                          { onSuccess: () => notify.success(`${column.name} moved right`), onError: notify.error },
                        )
                      }}
                    >
                      <ArrowRight size={14} strokeWidth={1.75} className="text-muted-foreground" /> Move right
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      if (tasks.length > 0) setBlocked(true)
                      else setDeleting(true)
                    }}
                  >
                    <Trash size={14} strokeWidth={1.75} /> Delete Column
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task, i) => (
            <SortableTask
              key={revealKey(task.id, i)}
              task={task}
              labelById={labelById}
              memberById={memberById}
              isDone={column.is_done}
              disabled={!editable}
              hidden={task.id === draggingId}
              onOpen={() => onOpenTask(task.id)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && !adding && (
          <p className="flex min-h-14 items-center justify-center rounded-md border border-dashed bg-card px-3 text-center text-xs text-muted-foreground">
            {editable ? 'Drop a Task here' : 'No Tasks'}
          </p>
        )}
        {adding && <NewTaskInput projectId={projectId} columnId={column.id} onDone={() => setAdding(false)} />}
        {editable && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-8 flex-none items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus size={14} /> Add Task
          </button>
        )}
      </div>

      {renaming && <ColumnDialog projectId={projectId} column={column} onClose={() => setRenaming(false)} />}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete Column"
        confirmLabel="Delete"
        body={
          <p>
            Delete the empty Column <strong className="font-medium">{column.name}</strong>?
          </p>
        }
        onConfirm={() => del.mutateAsync(column.id).then(() => notify.success('Column deleted'))}
      />
      <FormDialog
        open={blocked}
        onClose={() => setBlocked(false)}
        title="This Column still has Tasks"
        size="sm"
        footer={
          <Button onClick={() => setBlocked(false)}>
            Got it
          </Button>
        }
      >
        <p className="text-sm">
          <strong className="font-medium">{column.name}</strong> holds {tasks.length} Task{tasks.length === 1 ? '' : 's'}.
          Move them to another Column or delete them first, then delete the Column.
        </p>
      </FormDialog>
    </li>
  )
}

function NewTaskInput({ projectId, columnId, onDone }: { projectId: string; columnId: string; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const create = useCreateTask(projectId)

  function submit(e?: FormEvent) {
    e?.preventDefault()
    const value = title.trim()
    if (!value) {
      onDone()
      return
    }
    create.mutate({ columnId, title: value }, { onSuccess: () => notify.success('Task added'), onError: notify.error })
    setTitle('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      onDone()
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-md border border-foreground/60 bg-card p-2">
      <label className="sr-only" htmlFor={`new-task-${columnId}`}>
        Task title
      </label>
      <Textarea
        id={`new-task-${columnId}`}
        autoFocus
        rows={2}
        maxLength={200}
        value={title}
        placeholder="What needs doing?"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        className="min-h-0 resize-none border-0 bg-transparent px-1 py-0.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="flex items-center justify-end gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" type="submit" loading={create.isPending}>
          Add
        </Button>
      </div>
    </form>
  )
}
