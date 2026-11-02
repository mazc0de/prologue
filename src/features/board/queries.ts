import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { expectRows, unwrap } from '@/lib/errors'
import { positionAfterLast, rebalancedPositions } from '@/lib/position'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { BoardColumn, Label, LabelColor, Task, TaskPriority } from '@/lib/types'

export type BoardTask = Task & { task_labels: { label_id: string }[] }

export interface BoardData {
  columns: BoardColumn[]
  tasks: BoardTask[]
}

const byPosition = <T extends { position: number; created_at: string }>(a: T, b: T) =>
  a.position - b.position || a.created_at.localeCompare(b.created_at)

/** Mutations share this key so realtime refetches wait until they settle. */
const boardMutationKey = (projectId: string) => ['board-mutation', projectId]

export function useBoard(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.board(projectId),
    enabled,
    queryFn: async (): Promise<BoardData> => {
      const [columns, tasks] = await Promise.all([
        supabase.from('board_columns').select('*').eq('project_id', projectId),
        supabase.from('tasks').select('*, task_labels(label_id)').eq('project_id', projectId),
      ])
      return {
        columns: unwrap(columns).sort(byPosition),
        tasks: (unwrap(tasks) as BoardTask[]).sort(byPosition),
      }
    },
  })
}

/** Subscribe to Board changes from other people and reconcile with the cache. */
export function useBoardRealtime(projectId: string) {
  const queryClient = useQueryClient()
  useEffect(() => {
    let timer: number | undefined
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        // Don't clobber optimistic state while our own writes are in flight;
        // the mutation's onSettled refetches afterwards.
        if (queryClient.isMutating({ mutationKey: boardMutationKey(projectId) }) > 0) return
        queryClient.invalidateQueries({ queryKey: queryKeys.board(projectId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.projectCard(projectId) })
      }, 150)
    }
    const known = (taskOrColumnId: unknown) => {
      const data = queryClient.getQueryData<BoardData>(queryKeys.board(projectId))
      return Boolean(
        data && (data.tasks.some((t) => t.id === taskOrColumnId) || data.columns.some((c) => c.id === taskOrColumnId)),
      )
    }
    const filter = `project_id=eq.${projectId}`
    const channel = supabase.channel(`board:${projectId}`)
    for (const table of ['tasks', 'board_columns', 'task_labels'] as const) {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, refresh)
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, refresh)
      // DELETE events can't be filtered and carry only the primary key.
      channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (payload) => {
        const old = payload.old as { id?: string; task_id?: string }
        if (known(old.id ?? old.task_id)) refresh()
      })
    }
    channel.subscribe()
    return () => {
      window.clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [projectId, queryClient])
}

function useBoardMutation<TVars>(
  projectId: string,
  mutationFn: (vars: TVars) => Promise<unknown>,
  optimistic?: (data: BoardData, vars: TVars) => BoardData,
) {
  const queryClient = useQueryClient()
  const key = queryKeys.board(projectId)
  return useMutation({
    mutationKey: boardMutationKey(projectId),
    mutationFn,
    onMutate: async (vars: TVars) => {
      if (!optimistic) return { previous: undefined }
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<BoardData>(key)
      if (previous) queryClient.setQueryData<BoardData>(key, optimistic(previous, vars))
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous)
    },
    onSettled: () => settle(queryClient, projectId),
  })
}

function settle(queryClient: QueryClient, projectId: string) {
  if (queryClient.isMutating({ mutationKey: boardMutationKey(projectId) }) > 1) return
  queryClient.invalidateQueries({ queryKey: queryKeys.board(projectId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.projectCard(projectId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.projectCards, exact: true })
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient()
  return useBoardMutation(projectId, async ({ columnId, title }: { columnId: string; title: string }) => {
    const data = queryClient.getQueryData<BoardData>(queryKeys.board(projectId))
    const inColumn = data?.tasks.filter((t) => t.column_id === columnId) ?? []
    return expectRows(
      await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          column_id: columnId,
          title: title.trim(),
          position: positionAfterLast(inColumn.map((t) => t.position)),
        })
        .select('id'),
    )
  })
}

export type TaskPatch = Partial<{
  title: string
  description: string
  priority: TaskPriority
  due_date: string | null
  assignee_id: string | null
}>

export function useUpdateTask(projectId: string) {
  return useBoardMutation(
    projectId,
    async ({ id, patch }: { id: string; patch: TaskPatch }) =>
      expectRows(await supabase.from('tasks').update(patch).eq('id', id).select('id')),
    (data, { id, patch }) => ({ ...data, tasks: data.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
  )
}

/** Drop a Task into a Column at a fractional position: one row written. */
export function useMoveTask(projectId: string) {
  return useBoardMutation(
    projectId,
    async ({ id, columnId, position }: { id: string; columnId: string; position: number }) =>
      expectRows(
        await supabase.from('tasks').update({ column_id: columnId, position }).eq('id', id).select('id'),
      ),
    (data, { id, columnId, position }) => ({
      ...data,
      tasks: data.tasks.map((t) => (t.id === id ? { ...t, column_id: columnId, position } : t)).sort(byPosition),
    }),
  )
}

/** Rewrites a Column's Task positions evenly when the gaps get tiny. */
export function useRebalanceColumn(projectId: string) {
  return useBoardMutation(projectId, async (taskIds: string[]) => {
    const positions = rebalancedPositions(taskIds.length)
    await Promise.all(
      taskIds.map(async (id, i) =>
        expectRows(await supabase.from('tasks').update({ position: positions[i] }).eq('id', id).select('id')),
      ),
    )
  })
}

export function useDeleteTask(projectId: string) {
  return useBoardMutation(
    projectId,
    async (id: string) => expectRows(await supabase.from('tasks').delete().eq('id', id).select('id')),
    (data, id) => ({ ...data, tasks: data.tasks.filter((t) => t.id !== id) }),
  )
}

export function useSetTaskLabels(projectId: string) {
  return useBoardMutation(
    projectId,
    async ({ taskId, labelIds }: { taskId: string; labelIds: string[] }) => {
      const current = unwrap(await supabase.from('task_labels').select('label_id').eq('task_id', taskId))
      const have = new Set(current.map((r) => r.label_id))
      const want = new Set(labelIds)
      const toRemove = [...have].filter((id) => !want.has(id))
      const toAdd = [...want].filter((id) => !have.has(id))
      if (toRemove.length) {
        expectRows(
          await supabase.from('task_labels').delete().eq('task_id', taskId).in('label_id', toRemove).select('task_id'),
        )
      }
      if (toAdd.length) {
        expectRows(
          await supabase
            .from('task_labels')
            .insert(toAdd.map((label_id) => ({ task_id: taskId, label_id, project_id: projectId })))
            .select('task_id'),
        )
      }
    },
    (data, { taskId, labelIds }) => ({
      ...data,
      tasks: data.tasks.map((t) =>
        t.id === taskId ? { ...t, task_labels: labelIds.map((label_id) => ({ label_id })) } : t,
      ),
    }),
  )
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export function useCreateColumn(projectId: string) {
  const queryClient = useQueryClient()
  return useBoardMutation(projectId, async ({ name, isDone }: { name: string; isDone: boolean }) => {
    const data = queryClient.getQueryData<BoardData>(queryKeys.board(projectId))
    return expectRows(
      await supabase
        .from('board_columns')
        .insert({
          project_id: projectId,
          name: name.trim(),
          is_done: isDone,
          position: positionAfterLast(data?.columns.map((c) => c.position) ?? []),
        })
        .select('id'),
    )
  })
}

export function useUpdateColumn(projectId: string) {
  return useBoardMutation(
    projectId,
    async ({ id, patch }: { id: string; patch: Partial<Pick<BoardColumn, 'name' | 'is_done' | 'position'>> }) =>
      expectRows(await supabase.from('board_columns').update(patch).eq('id', id).select('id')),
    (data, { id, patch }) => ({
      ...data,
      columns: data.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)).sort(byPosition),
    }),
  )
}

export function useDeleteColumn(projectId: string) {
  return useBoardMutation(
    projectId,
    // The FK rejects deleting a Column that still has Tasks (23503).
    async (id: string) => expectRows(await supabase.from('board_columns').delete().eq('id', id).select('id')),
    (data, id) => ({ ...data, columns: data.columns.filter((c) => c.id !== id) }),
  )
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export function useLabels(projectId: string) {
  return useQuery({
    queryKey: queryKeys.labels(projectId),
    queryFn: async () =>
      (unwrap(await supabase.from('labels').select('*').eq('project_id', projectId).order('name')) as Label[]),
  })
}

export function useSaveLabel(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, color }: { id?: string; name: string; color: LabelColor }) => {
      const row = { name: name.trim(), color }
      if (id) return expectRows(await supabase.from('labels').update(row).eq('id', id).select('id'))
      return expectRows(await supabase.from('labels').insert({ ...row, project_id: projectId }).select('id'))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.labels(projectId) }),
  })
}

export function useDeleteLabel(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => expectRows(await supabase.from('labels').delete().eq('id', id).select('id')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.board(projectId) })
    },
  })
}
