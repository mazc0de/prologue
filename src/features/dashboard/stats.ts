import type { ProjectCard } from '@/lib/types'
import type { DashboardTask } from './queries'

/** Done / total per Project id. */
export function progressByProject(tasks: DashboardTask[]) {
  const map = new Map<string, { done: number; total: number }>()
  for (const t of tasks) {
    const entry = map.get(t.project_id) ?? { done: 0, total: 0 }
    entry.total += 1
    if (t.is_done) entry.done += 1
    map.set(t.project_id, entry)
  }
  return map
}

/** Name, description or Tag contains the query (case-insensitive). */
export function matchesQuery(card: ProjectCard, q: string) {
  if (!q) return true
  const needle = q.toLowerCase()
  return (
    card.name.toLowerCase().includes(needle) ||
    card.description.toLowerCase().includes(needle) ||
    card.tech_tags.some((t) => t.toLowerCase().includes(needle))
  )
}

/** Has every one of the selected Tags (case-insensitive); no selection matches everything. */
export function matchesTags(card: ProjectCard, tags: string[]) {
  if (!tags.length) return true
  const own = new Set(card.tech_tags.map((t) => t.toLowerCase()))
  return tags.every((t) => own.has(t.toLowerCase()))
}
