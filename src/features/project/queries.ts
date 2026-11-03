import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expectRows, unwrap } from '@/lib/errors'
import { normaliseEmail } from '@/lib/format'
import { positionAfterLast } from '@/lib/position'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'
import type {
  CredentialField,
  Environment,
  EnvironmentCredential,
  EnvironmentKind,
  ProjectCard,
  ProjectRole,
  ProjectStatus,
  QuickLink,
  Repository,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Project header (from the project_cards view: it already carries my_role and pin)
// ---------------------------------------------------------------------------

export function useProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectCard(projectId),
    queryFn: async () =>
      unwrap(await supabase.from('project_cards').select('*').eq('id', projectId).maybeSingle()) as ProjectCard | null,
  })
}

type ProjectPatch = Partial<{ name: string; description: string; status: ProjectStatus; tech_tags: string[] }>

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    // Only name, description, status and tech_tags are updatable (column grants).
    mutationFn: async (patch: ProjectPatch) =>
      expectRows(await supabase.from('projects').update(patch).eq('id', projectId).select('id')),
    onMutate: async (patch) => {
      const key = queryKeys.projectCard(projectId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ProjectCard | null>(key)
      queryClient.setQueryData<ProjectCard | null>(key, (p) => (p ? { ...p, ...patch } : p))
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx) queryClient.setQueryData(queryKeys.projectCard(projectId), ctx.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projectCards }),
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: string) =>
      expectRows(await supabase.from('projects').delete().eq('id', projectId).select('id')),
    onSuccess: (_rows, projectId) => {
      queryClient.removeQueries({ queryKey: queryKeys.project(projectId) })
      queryClient.removeQueries({ queryKey: queryKeys.projectCard(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projectCards })
    },
  })
}

// ---------------------------------------------------------------------------
// Repository → Environments → .env (one Repository per Project)
// ---------------------------------------------------------------------------

/**
 * An Environment plus when its .env was last saved and how many Credentials it has. Only Owners
 * and Editors can read .env files and Credentials (RLS), so for a Viewer these are always
 * null and 0, whatever exists.
 */
export type EnvironmentSummary = Environment & { env_file_updated_at: string | null; credential_count: number }
export type RepositoryTree = Repository & { environments: EnvironmentSummary[] }

type RepositoryRow = Repository & {
  environments: (Environment & {
    environment_env_files: { updated_at: string }[]
    environment_credentials: { id: string }[]
  })[]
}

export function useRepositories(projectId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.repositories(projectId),
    enabled,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('repositories')
          // Only the timestamp: the .env content itself is fetched on demand (useEnvFile).
          .select('*, environments(*, environment_env_files(updated_at), environment_credentials(id))')
          .eq('project_id', projectId)
          .order('position')
          .order('created_at'),
      ) as RepositoryRow[]
      const byPos = <T extends { position: number; created_at: string }>(a: T, b: T) =>
        a.position - b.position || a.created_at.localeCompare(b.created_at)
      return rows.map(
        (repo): RepositoryTree => ({
          ...repo,
          environments: [...repo.environments]
            .sort(byPos)
            .map(({ environment_env_files, environment_credentials, ...env }) => ({
              ...env,
              env_file_updated_at: environment_env_files[0]?.updated_at ?? null,
              credential_count: environment_credentials.length,
            })),
        }),
      )
    },
  })
}

export function useEnvironmentVersions(projectId: string) {
  return useQuery({
    queryKey: queryKeys.environmentVersions(projectId),
    queryFn: async () => unwrap(await supabase.from('environment_versions').select('*').eq('project_id', projectId)),
    select: (rows) => new Map(rows.map((r) => [r.environment_id, r])),
  })
}

/** Invalidate everything that can change when repo/env/.env/release data changes. */
function useInvalidateDeployments(projectId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.repositories(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.environmentVersions(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.projectCard(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.projectCards, exact: true })
  }
}

export interface RepositoryInput {
  id?: string
  name: string
  url: string
  /** Only when creating: the Production Environment's branch (required) and the Development one (optional). */
  productionBranch?: string
  developmentBranch?: string
}

export function useSaveRepository(projectId: string) {
  const invalidate = useInvalidateDeployments(projectId)
  return useMutation({
    mutationFn: async (input: RepositoryInput) => {
      if (input.id) {
        expectRows(
          await supabase.from('repositories').update({ name: input.name, url: input.url }).eq('id', input.id).select('id'),
        )
        return
      }
      // One Repository per Project. The RPC creates it with its Production (and optional
      // Development) Environment on the branches the user typed, in one transaction.
      unwrap(
        await supabase.rpc('create_repository', {
          p_project_id: projectId,
          p_name: input.name,
          p_url: input.url,
          p_production_branch: input.productionBranch ?? '',
          p_development_branch: input.developmentBranch || null,
        }),
      )
    },
    onSuccess: invalidate,
  })
}

export function useDeleteRepository(projectId: string) {
  const invalidate = useInvalidateDeployments(projectId)
  return useMutation({
    mutationFn: async (id: string) => expectRows(await supabase.from('repositories').delete().eq('id', id).select('id')),
    onSuccess: invalidate,
  })
}

export interface EnvironmentInput {
  id?: string
  repository_id: string
  name: string
  kind: EnvironmentKind
  branch: string
  /** The new .env content; empty deletes it, undefined leaves it untouched. */
  envFile?: string
}

/** One Environment's .env content, or null when it has none. Owners and Editors only. */
export function useEnvFile(environmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.envFile(environmentId ?? ''),
    enabled: !!environmentId,
    queryFn: async () => {
      const row = unwrap(
        await supabase.from('environment_env_files').select('content').eq('environment_id', environmentId!).maybeSingle(),
      ) as { content: string } | null
      return row?.content ?? null
    },
  })
}

export function useSaveEnvironment(projectId: string) {
  const invalidate = useInvalidateDeployments(projectId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: EnvironmentInput) => {
      let environmentId = input.id
      if (environmentId) {
        expectRows(
          await supabase
            .from('environments')
            .update({ name: input.name, kind: input.kind, branch: input.branch })
            .eq('id', environmentId)
            .select('id'),
        )
      } else {
        const repos = queryClient.getQueryData<RepositoryTree[]>(queryKeys.repositories(projectId)) ?? []
        const siblings = repos.find((r) => r.id === input.repository_id)?.environments ?? []
        const rows = expectRows(
          await supabase
            .from('environments')
            .insert({
              project_id: projectId,
              repository_id: input.repository_id,
              name: input.name,
              kind: input.kind,
              branch: input.branch,
              position: positionAfterLast(siblings.map((e) => e.position)),
            })
            .select('id'),
        )
        environmentId = rows[0].id
      }

      if (input.envFile === undefined) return environmentId
      const content = input.envFile.trimEnd()
      if (content) {
        expectRows(
          await supabase
            .from('environment_env_files')
            .upsert({ environment_id: environmentId, project_id: projectId, content }, { onConflict: 'environment_id' })
            .select('environment_id'),
        )
      } else {
        // May match no row (there was no .env), so don't insist on one.
        unwrap(await supabase.from('environment_env_files').delete().eq('environment_id', environmentId))
      }
      return environmentId
    },
    onSuccess: (environmentId) => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: queryKeys.envFile(environmentId) })
    },
  })
}

export function useDeleteEnvironment(projectId: string) {
  const invalidate = useInvalidateDeployments(projectId)
  return useMutation({
    mutationFn: async (id: string) => expectRows(await supabase.from('environments').delete().eq('id', id).select('id')),
    onSuccess: invalidate,
  })
}

// ---------------------------------------------------------------------------
// Credentials: test accounts per Environment (Owners and Editors only)
// ---------------------------------------------------------------------------

export function useCredentials(environmentId: string) {
  return useQuery({
    queryKey: queryKeys.credentials(environmentId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('environment_credentials')
          .select('*')
          .eq('environment_id', environmentId)
          .order('position')
          .order('created_at'),
      ) as unknown as EnvironmentCredential[],
  })
}

export interface CredentialInput {
  id?: string
  environment_id: string
  label: string
  fields: CredentialField[]
}

function useInvalidateCredentials(projectId: string) {
  const queryClient = useQueryClient()
  const invalidateDeployments = useInvalidateDeployments(projectId)
  return (environmentId: string) => {
    invalidateDeployments() // the Environment row shows the Credential count
    queryClient.invalidateQueries({ queryKey: queryKeys.credentials(environmentId) })
  }
}

export function useSaveCredential(projectId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCredentials(projectId)
  return useMutation({
    mutationFn: async (input: CredentialInput) => {
      const row = {
        label: input.label.trim(),
        fields: input.fields
          .map((f) => ({ name: f.name.trim(), value: f.value }))
          .filter((f) => f.name || f.value) as unknown as Json,
      }
      if (input.id) {
        expectRows(await supabase.from('environment_credentials').update(row).eq('id', input.id).select('id'))
      } else {
        const siblings = queryClient.getQueryData<EnvironmentCredential[]>(queryKeys.credentials(input.environment_id)) ?? []
        expectRows(
          await supabase
            .from('environment_credentials')
            .insert({
              ...row,
              environment_id: input.environment_id,
              project_id: projectId,
              position: positionAfterLast(siblings.map((c) => c.position)),
            })
            .select('id'),
        )
      }
      return input.environment_id
    },
    onSuccess: invalidate,
  })
}

export function useDeleteCredential(projectId: string) {
  const invalidate = useInvalidateCredentials(projectId)
  return useMutation({
    mutationFn: async ({ id, environmentId }: { id: string; environmentId: string }) => {
      expectRows(await supabase.from('environment_credentials').delete().eq('id', id).select('id'))
      return environmentId
    },
    onSuccess: invalidate,
  })
}

// ---------------------------------------------------------------------------
// Releases (Version = latest Release, ADR 0002)
// ---------------------------------------------------------------------------

export function useReleases(environmentId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.releases(environmentId),
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('releases')
          .select('*, author:profiles(display_name)')
          .eq('environment_id', environmentId)
          .order('released_at', { ascending: false })
          .order('created_at', { ascending: false }),
      ),
  })
}

export interface ReleaseInput {
  id?: string
  environment_id: string
  version: string
  notes: string
  released_at: string
}

export function useSaveRelease(projectId: string) {
  const invalidate = useInvalidateDeployments(projectId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReleaseInput) => {
      const row = { version: input.version.trim(), notes: input.notes, released_at: input.released_at }
      if (input.id) {
        return expectRows(await supabase.from('releases').update(row).eq('id', input.id).select('id'))
      }
      return expectRows(
        await supabase
          .from('releases')
          .insert({ ...row, environment_id: input.environment_id, project_id: projectId })
          .select('id'),
      )
    },
    onSuccess: (_d, input) => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: queryKeys.releases(input.environment_id) })
    },
  })
}

export function useDeleteRelease(projectId: string) {
  const invalidate = useInvalidateDeployments(projectId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; environmentId: string }) =>
      expectRows(await supabase.from('releases').delete().eq('id', id).select('id')),
    onSuccess: (_d, { environmentId }) => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: queryKeys.releases(environmentId) })
    },
  })
}

// ---------------------------------------------------------------------------
// Quick Links
// ---------------------------------------------------------------------------

export function useQuickLinks(projectId: string) {
  return useQuery({
    queryKey: queryKeys.quickLinks(projectId),
    queryFn: async () =>
      unwrap(
        await supabase.from('quick_links').select('*').eq('project_id', projectId).order('position').order('created_at'),
      ) as QuickLink[],
  })
}

export function useSaveQuickLink(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: string; label: string; url: string }) => {
      const row = { label: input.label.trim(), url: input.url.trim() }
      if (input.id) return expectRows(await supabase.from('quick_links').update(row).eq('id', input.id).select('id'))
      const existing = queryClient.getQueryData<QuickLink[]>(queryKeys.quickLinks(projectId)) ?? []
      return expectRows(
        await supabase
          .from('quick_links')
          .insert({ ...row, project_id: projectId, position: positionAfterLast(existing.map((l) => l.position)) })
          .select('id'),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.quickLinks(projectId) }),
  })
}

export function useDeleteQuickLink(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => expectRows(await supabase.from('quick_links').delete().eq('id', id).select('id')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.quickLinks(projectId) }),
  })
}

// ---------------------------------------------------------------------------
// Members & Invitations
// ---------------------------------------------------------------------------

export interface MemberRow {
  user_id: string
  role: ProjectRole
  joined_at: string
  profile: { display_name: string; email: string } | null
}

const ROLE_ORDER: Record<ProjectRole, number> = { owner: 0, editor: 1, viewer: 2 }

export function useMembers(projectId: string) {
  return useQuery({
    queryKey: queryKeys.members(projectId),
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('project_members')
          .select('user_id, role, joined_at, profile:profiles(display_name, email)')
          .eq('project_id', projectId),
      ) as MemberRow[]
      return rows.sort(
        (a, b) =>
          ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
          (a.profile?.display_name ?? '').localeCompare(b.profile?.display_name ?? ''),
      )
    },
  })
}

export function useChangeRole(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Exclude<ProjectRole, 'owner'> }) =>
      expectRows(
        await supabase
          .from('project_members')
          .update({ role })
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .select('user_id'),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.members(projectId) }),
  })
}

/** Owner removes a Member, or a Member leaves (userId = self). */
export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) =>
      expectRows(
        await supabase
          .from('project_members')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .select('user_id'),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.board(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projectCards })
    },
  })
}

export function usePendingInvitations(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.pendingInvitations(projectId),
    enabled,
    queryFn: async () => unwrap(await supabase.rpc('project_pending_invitations', { p_project_id: projectId })),
  })
}

export async function checkInvitee(projectId: string, email: string) {
  const rows = unwrap(
    await supabase.rpc('check_invitee', { p_project_id: projectId, p_email: normaliseEmail(email) }),
  )
  const row = rows[0]
  return {
    isRegistered: row?.is_registered ?? false,
    displayName: (row?.display_name as string | null) ?? null,
    isMember: row?.is_member ?? false,
    hasPendingInvitation: row?.has_pending_invitation ?? false,
  }
}

export function useInvite(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: Exclude<ProjectRole, 'owner'> }) =>
      expectRows(
        await supabase
          .from('invitations')
          .insert({ project_id: projectId, email: normaliseEmail(email), role })
          .select('id'),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pendingInvitations(projectId) }),
  })
}

export function useRevokeInvitation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => expectRows(await supabase.from('invitations').delete().eq('id', id).select('id')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pendingInvitations(projectId) }),
  })
}

export function registrationMessage(projectName: string, email: string): string {
  const origin = window.location.origin
  return `You've been invited to "${projectName}" on Prologue. Register at ${origin}/register?email=${encodeURIComponent(email)}`
}
