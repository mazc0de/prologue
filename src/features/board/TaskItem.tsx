import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { LabelChip, PriorityMark } from '@/components/badges'
import { cn } from '@/lib/utils'
import { formatDueDate, todayISODate } from '@/lib/format'
import type { Label } from '@/lib/types'
import type { BoardTask } from './queries'

interface TileProps {
  task: BoardTask
  labelById: Map<string, Label>
  memberById: Map<string, string>
  isDone: boolean
  overlay?: boolean
}

/** A Task on the Board (not a "card": see GLOSSARY). */
export function TaskTile({ task, labelById, memberById, isDone, overlay }: TileProps) {
  const labels = task.task_labels.map((tl) => labelById.get(tl.label_id)).filter(Boolean) as Label[]
  const overdue = !isDone && task.due_date !== null && task.due_date < todayISODate()
  const assigneeName = task.assignee_id ? memberById.get(task.assignee_id) : undefined
  const showPriority = task.priority === 'high' || task.priority === 'urgent'
  const hasFooter = showPriority || task.due_date || task.assignee_id

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border bg-card px-3 py-2.5 text-left',
        overlay && 'w-[272px] rotate-[1.5deg] cursor-grabbing ',
      )}
    >
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((l) => (
            <LabelChip key={l.id} name={l.name} color={l.color} />
          ))}
        </div>
      )}
      <p className={cn('text-sm break-words', isDone && 'text-muted-foreground')}>{task.title}</p>
      {hasFooter && (
        <div className="flex items-center gap-3">
          {showPriority && <PriorityMark priority={task.priority} withLabel />}
          {task.due_date && (
            <span
              className={cn('inline-flex items-center gap-1 text-xs', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}
              title={overdue ? 'Overdue' : 'Due date'}
            >
              <CalendarDays size={12} strokeWidth={1.75} aria-hidden />
              {formatDueDate(task.due_date)}
              {overdue && <span className="sr-only">(overdue)</span>}
            </span>
          )}
          {task.assignee_id && (
            <Avatar userId={task.assignee_id} name={assigneeName ?? 'Member'} size={20} className="ml-auto" />
          )}
        </div>
      )}
    </div>
  )
}

export function SortableTask({
  onOpen,
  disabled,
  hidden,
  ...tile
}: Omit<TileProps, 'overlay'> & { onOpen: () => void; disabled: boolean; hidden: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tile.task.id, disabled })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('flex-none', hidden && 'opacity-40')}
    >
      <button
        type="button"
        onClick={onOpen}
        {...attributes}
        {...listeners}
        aria-roledescription={disabled ? undefined : 'draggable Task'}
        aria-label={`${tile.task.title}. Open Task`}
        className={cn(
          'block w-full rounded-md transition-[border-color] [&>div]:transition-colors hover:[&>div]:border-input',
          !disabled && 'cursor-grab active:cursor-grabbing',
        )}
      >
        <TaskTile {...tile} />
      </button>
    </div>
  )
}
