import type { EnvironmentKind, EnvironmentVersion, ProjectCard, QuickLink, Release } from '@/lib/types'
import type { EnvironmentSummary, MemberRow, RepositoryTree } from './queries'

/*
 * Placeholder data for the pencil-sketch loading state (LOADING_DESIGN.md) of the Project page.
 * Ids are never sent anywhere: sections only query with the real Project id from the URL.
 */

const NOW = new Date().toISOString()

/** An Editor's view, so the sketch includes the edit controls without firing Owner-only queries. */
export function sketchProject(id: string): ProjectCard {
  return {
    id,
    name: 'Project name',
    description: 'A short description of what this Project is, where it runs and what is left to do.',
    status: 'active',
    my_role: 'editor',
    tech_tags: ['stack', 'framework', 'database'],
    production_version: 'v0.0.0',
    open_task_count: 0,
    pinned_at: null,
    last_activity_at: NOW,
  }
}

function sketchEnvironment(projectId: string, kind: EnvironmentKind, branch: string, position: number): EnvironmentSummary {
  const id = `sketch-env-${kind}`
  return {
    id,
    name: kind,
    kind,
    branch,
    position,
    project_id: projectId,
    repository_id: 'sketch-repo',
    created_at: NOW,
    updated_at: NOW,
    env_file_updated_at: NOW,
    credential_count: 1,
  }
}

export function sketchRepository(projectId: string): RepositoryTree {
  return {
    id: 'sketch-repo',
    name: 'repository',
    url: 'https://github.com/owner/repository',
    provider: 'github',
    position: 0,
    project_id: projectId,
    created_at: NOW,
    updated_at: NOW,
    environments: [sketchEnvironment(projectId, 'production', 'main', 0), sketchEnvironment(projectId, 'development', 'develop', 1)],
  }
}

export function sketchVersions(repo: RepositoryTree): Map<string, EnvironmentVersion> {
  return new Map(
    repo.environments.map((env) => [
      env.id,
      { environment_id: env.id, project_id: env.project_id, release_id: `${env.id}-release`, released_at: NOW, version: 'v0.0.0' },
    ]),
  )
}

export function sketchQuickLinks(projectId: string): QuickLink[] {
  return [0, 1].map((i) => ({
    id: `sketch-link-${i}`,
    label: 'Link label',
    url: 'https://example.com',
    position: i,
    project_id: projectId,
    created_at: NOW,
  }))
}

export const SKETCH_MEMBERS: MemberRow[] = [
  { user_id: 'sketch-member-0', role: 'owner', joined_at: NOW, profile: { display_name: 'Member name', email: 'member@example.com' } },
  { user_id: 'sketch-member-1', role: 'editor', joined_at: NOW, profile: { display_name: 'Member name', email: 'member@example.com' } },
]

export function sketchReleases(projectId: string, environmentId: string): (Release & { author: { display_name: string } | null })[] {
  return [0, 1].map((i) => ({
    id: `sketch-release-${i}`,
    version: 'v0.0.0',
    notes: 'Release notes.',
    released_at: NOW,
    environment_id: environmentId,
    project_id: projectId,
    created_at: NOW,
    created_by: null,
    author: { display_name: 'Member name' },
  }))
}
