import type { Database, Tables } from './database.types'

type Enums = Database['public']['Enums']

export type ProjectRole = Enums['project_role']
export type ProjectStatus = Enums['project_status']
export type EnvironmentKind = Enums['environment_kind']
export type RepoProvider = Enums['repo_provider']
export type TaskPriority = Enums['task_priority']

export type Profile = Tables<'profiles'>
export type Project = Tables<'projects'>
export type ProjectCard = Tables<'project_cards'>
export type ProjectMember = Tables<'project_members'>
export type QuickLink = Tables<'quick_links'>
export type Repository = Tables<'repositories'>
export type Environment = Tables<'environments'>
export type EnvironmentEnvFile = Tables<'environment_env_files'>
export type EnvironmentCredential = Omit<Tables<'environment_credentials'>, 'fields'> & { fields: CredentialField[] }

/** One named value of a Credential, e.g. { name: 'Username', value: 'demo' }. */
export interface CredentialField {
  name: string
  value: string
}
export type EnvironmentVersion = Tables<'environment_versions'>
export type Release = Tables<'releases'>
export type BoardColumn = Tables<'board_columns'>
export type Label = Tables<'labels'>
export type Task = Tables<'tasks'>
export type TaskLabel = Tables<'task_labels'>

export type LabelColor = 'gray' | 'red' | 'orange' | 'amber' | 'green' | 'teal' | 'blue' | 'violet' | 'pink'

/** Active, or Inactive (e.g. moved to a new repository). Inactive Projects leave the dashboard overview. */
export const PROJECT_STATUSES: ProjectStatus[] = ['active', 'inactive']
export const ENVIRONMENT_KINDS: EnvironmentKind[] = ['production', 'staging', 'development', 'preview', 'other']
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
export const LABEL_COLORS: LabelColor[] = ['gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink']

/** Tags are stored in projects.tech_tags (the column kept its old name). */
export const MAX_TAGS = 20

export const canEdit = (role: ProjectRole | null | undefined) => role === 'owner' || role === 'editor'
export const isOwner = (role: ProjectRole | null | undefined) => role === 'owner'

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
