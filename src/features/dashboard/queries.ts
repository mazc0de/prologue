import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expectRows, unwrap } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { ProjectCard, Task } from '@/lib/types'

export function useProjectCards() {
  return useQuery({
    queryKey: queryKeys.projectCards,
    queryFn: async () => unwrap(await supabase.from('project_cards').select('*')) as ProjectCard[],
  })
}

/** Pinned first, then most recent activity. */
export function sortCards(cards: ProjectCard[]): ProjectCard[] {
  return [...cards].sort((a, b) => {
    if (Boolean(a.pinned_at) !== Boolean(b.pinned_at)) return a.pinned_at ? -1 : 1
    return b.last_activity_at.localeCompare(a.last_activity_at)
  })
}

export function useTogglePin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, pinned }: { projectId: string; pinned: boolean }) => {
      if (pinned) {
        unwrap(await supabase.from('project_pins').insert({ project_id: projectId }).select())
      } else {
        expectRows(await supabase.from('project_pins').delete().eq('project_id', projectId).select())
      }
    },
    onMutate: async ({ projectId, pinned }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectCards })
      const previous = queryClient.getQueryData<ProjectCard[]>(queryKeys.projectCards)
      queryClient.setQueryData<ProjectCard[]>(queryKeys.projectCards, (cards) =>
        cards?.map((c) => (c.id === projectId ? { ...c, pinned_at: pinned ? new Date().toISOString() : null } : c)),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.projectCards, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projectCards }),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; description: string; tech_tags: string[] }) => {
      // Owner membership and default Columns are created by trigger.
      const rows = expectRows(await supabase.from('projects').insert(input).select('id'))
      return rows[0].id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projectCards }),
  })
}

/** A Task as the dashboard sees it: enough to count, chart and list, across every Project I'm in. */
export interface DashboardTask {
  id: string
  project_id: string
  title: string
  priority: Task['priority']
  due_date: string | null
  assignee_id: string | null
  created_at: string
  is_done: boolean
}

export function useDashboardTasks() {
  return useQuery({
    queryKey: queryKeys.dashboardTasks,
    staleTime: 0,
    queryFn: async (): Promise<DashboardTask[]> => {
      const rows = unwrap(
        await supabase
          .from('tasks')
          .select('id, project_id, title, priority, due_date, assignee_id, created_at, column:board_columns(is_done)'),
      )
      return rows.map(({ column, ...t }) => ({ ...t, is_done: Boolean(column?.is_done) }))
    },
  })
}

export interface Collaborator {
  user_id: string
  display_name: string
  email: string
  project_ids: string[]
}

/** Everyone I share at least one Project with, most shared Projects first. */
export function useCollaborators(myUserId: string | null) {
  return useQuery({
    queryKey: queryKeys.collaborators,
    enabled: Boolean(myUserId),
    queryFn: async (): Promise<Collaborator[]> => {
      const rows = unwrap(
        await supabase.from('project_members').select('project_id, user_id, profile:profiles(display_name, email)'),
      )
      const byUser = new Map<string, Collaborator>()
      for (const row of rows) {
        if (row.user_id === myUserId) continue
        const entry = byUser.get(row.user_id) ?? {
          user_id: row.user_id,
          display_name: row.profile?.display_name ?? 'Member',
          email: row.profile?.email ?? '',
          project_ids: [],
        }
        entry.project_ids.push(row.project_id)
        byUser.set(row.user_id, entry)
      }
      return [...byUser.values()].sort(
        (a, b) => b.project_ids.length - a.project_ids.length || a.display_name.localeCompare(b.display_name),
      )
    },
  })
}
