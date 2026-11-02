import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Bar, BlockError } from '@/components/Loading'
import { notify } from '@/lib/notify'
import { useMembers } from '@/features/project/queries'
import { errorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/format'
import { needsRebalance, positionBetween } from '@/lib/position'
import { canEdit, type Label, type ProjectCard } from '@/lib/types'
import { BoardColumnView, COLUMN_PREFIX } from './BoardColumnView'
import { ColumnDialog } from './ColumnDialog'
import { LabelsDialog } from './LabelsDialog'
import {
  useBoard,
  useBoardRealtime,
  useLabels,
  useMoveTask,
  useRebalanceColumn,
  type BoardData,
  type BoardTask,
} from './queries'
import { TaskDialog } from './TaskDialog'
import { TaskTile } from './TaskItem'

type ColumnItems = Record<string, string[]>

function itemsFrom(data: BoardData): ColumnItems {
  const items: ColumnItems = {}
  for (const c of data.columns) items[c.id] = []
  for (const t of data.tasks) items[t.column_id]?.push(t.id)
  return items
}

export function Board({ project }: { project: ProjectCard }) {
  const projectId = project.id
  const editable = canEdit(project.my_role)
  const board = useBoard(projectId)
  const labels = useLabels(projectId)
  const members = useMembers(projectId)
  useBoardRealtime(projectId)

  const move = useMoveTask(projectId)
  const rebalance = useRebalanceColumn(projectId)

  // While dragging, a local copy of column → task ids drives the preview.
  const [dragItems, setDragItems] = useState<ColumnItems | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [managingLabels, setManagingLabels] = useState(false)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: press and hold so a swipe still scrolls the Board.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const data = board.data
  const baseItems = useMemo(() => (data ? itemsFrom(data) : {}), [data])
  const items = dragItems ?? baseItems
  const taskById = useMemo(() => new Map(data?.tasks.map((t) => [t.id, t]) ?? []), [data])
  const labelById = useMemo(() => new Map<string, Label>(labels.data?.map((l) => [l.id, l]) ?? []), [labels.data])
  const memberById = useMemo(
    () => new Map(members.data?.map((m) => [m.user_id, m.profile?.display_name ?? 'Unknown']) ?? []),
    [members.data],
  )

  const findContainer = (id: string, source: ColumnItems): string | undefined => {
    if (id.startsWith(COLUMN_PREFIX)) return id.slice(COLUMN_PREFIX.length)
    return Object.keys(source).find((col) => source[col].includes(id))
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
    setDragItems(baseItems)
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over || !dragItems) return
    const activeKey = String(active.id)
    const overKey = String(over.id)
    const from = findContainer(activeKey, dragItems)
    const to = findContainer(overKey, dragItems)
    if (!from || !to || from === to) return

    setDragItems((prev) => {
      if (!prev) return prev
      const fromItems = prev[from].filter((id) => id !== activeKey)
      const toItems = [...prev[to]]
      const overIndex = toItems.indexOf(overKey)
      const isBelow =
        over.rect && active.rect.current.translated
          ? active.rect.current.translated.top > over.rect.top + over.rect.height / 2
          : false
      const index = overIndex >= 0 ? overIndex + (isBelow ? 1 : 0) : toItems.length
      toItems.splice(index, 0, activeKey)
      return { ...prev, [from]: fromItems, [to]: toItems }
    })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    const activeKey = String(active.id)
    const current = dragItems
    setActiveId(null)
    setDragItems(null)
    if (!over || !current || !data) return

    const to = findContainer(String(over.id), current)
    if (!to) return
    let ordered = [...current[to]]
    const overKey = String(over.id)
    // Reorder within the final column.
    const oldIndex = ordered.indexOf(activeKey)
    const overIndex = ordered.indexOf(overKey)
    if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
      ordered.splice(oldIndex, 1)
      ordered.splice(overIndex, 0, activeKey)
    }
    if (!ordered.includes(activeKey)) ordered = [...ordered, activeKey]

    const index = ordered.indexOf(activeKey)
    const before = index > 0 ? taskById.get(ordered[index - 1])?.position : undefined
    const after = index < ordered.length - 1 ? taskById.get(ordered[index + 1])?.position : undefined
    const task = taskById.get(activeKey)
    if (!task) return

    const unchanged =
      task.column_id === to &&
      (before === undefined || task.position > before) &&
      (after === undefined || task.position < after)
    if (unchanged) return

    const position = positionBetween(before, after)
    move.mutate(
      { id: activeKey, columnId: to, position },
      {
        onError: notify.error,
        onSuccess: () => {
          if (needsRebalance(before, position, after)) rebalance.mutate(ordered)
        },
      },
    )
  }

  if (board.error) {
    return (
      <BoardFrame>
        <BlockError message={`Couldn't load the Board. ${errorMessage(board.error)}`} onRetry={() => board.refetch()} />
      </BoardFrame>
    )
  }

  if (!data) {
    return (
      <BoardFrame>
        <div className="flex gap-4 overflow-hidden" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex w-[288px] flex-none flex-col gap-2 rounded-md border bg-background p-3">
              <Bar className="h-5 w-24" />
              <Bar className="h-16 w-full bg-card" />
              <Bar className="h-16 w-full bg-card" />
            </div>
          ))}
        </div>
      </BoardFrame>
    )
  }

  const doneIds = new Set(data.columns.filter((c) => c.is_done).map((c) => c.id))
  const openCount = data.tasks.filter((t) => !doneIds.has(t.column_id)).length
  const activeTask = activeId ? taskById.get(activeId) : undefined
  const openTask = openTaskId ? taskById.get(openTaskId) : undefined

  return (
    <BoardFrame
      subtitle={`${pluralize(openCount, 'open Task')} · ${data.tasks.length - openCount} done`}
      actions={
        editable && (
          <>
            <Button size="sm" variant="ghost" onClick={() => setManagingLabels(true)}>
              <Tag size={14} strokeWidth={1.75} /> Labels
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddingColumn(true)}>
              <Plus size={14} strokeWidth={2} /> Add Column
            </Button>
          </>
        )
      }
    >
      <DndContext
        sensors={editable ? sensors : undefined}
        collisionDetection={closestCorners}
        onDragStart={editable ? onDragStart : undefined}
        onDragOver={editable ? onDragOver : undefined}
        onDragEnd={editable ? onDragEnd : undefined}
        onDragCancel={() => {
          setActiveId(null)
          setDragItems(null)
        }}
      >
        <div className="relative -mx-5 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6">
          <ol className="flex w-max items-start gap-4" aria-label="Columns">
            {data.columns.map((column, index) => (
              <BoardColumnView
                key={column.id}
                projectId={projectId}
                column={column}
                prevColumn={data.columns[index - 1]}
                prevPrevColumn={data.columns[index - 2]}
                nextColumn={data.columns[index + 1]}
                nextNextColumn={data.columns[index + 2]}
                tasks={(items[column.id] ?? []).map((id) => taskById.get(id)).filter(Boolean) as BoardTask[]}
                editable={editable}
                labelById={labelById}
                memberById={memberById}
                onOpenTask={setOpenTaskId}
                draggingId={activeId}
              />
            ))}
          </ol>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskTile
              task={activeTask}
              labelById={labelById}
              memberById={memberById}
              isDone={doneIds.has(activeTask.column_id)}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {openTask && (
        <TaskDialog
          projectId={projectId}
          task={openTask}
          columns={data.columns}
          labels={labels.data ?? []}
          members={members.data ?? []}
          editable={editable}
          onClose={() => setOpenTaskId(null)}
        />
      )}
      {addingColumn && <ColumnDialog projectId={projectId} onClose={() => setAddingColumn(false)} />}
      {managingLabels && <LabelsDialog projectId={projectId} onClose={() => setManagingLabels(false)} />}
    </BoardFrame>
  )
}

function BoardFrame({
  subtitle,
  actions,
  children,
}: {
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby="board-heading" className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
      <Card className="gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 id="board-heading" className="micro">
              Board
            </h2>
            {subtitle && <span className="data text-xs text-faint">{subtitle}</span>}
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
        {children}
      </Card>
    </section>
  )
}
