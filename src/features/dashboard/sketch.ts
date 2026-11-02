import { isoDate } from '@/lib/format'
import type { ProjectCard, ProjectRole } from '@/lib/types'
import type { DashboardTask } from './queries'

/*
 * Placeholder data for the pencil-sketch loading state (LOADING_DESIGN.md): the dashboard and the
 * Projects page draw this in pencil while the real data loads, then morph to the real thing.
 * Figures start at zero so they count up; versions share the real format so they count up too.
 */

const DAY = 864e5
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString()

function sketchCard(i: number, myRole: ProjectRole): ProjectCard {
  return {
    id: `sketch-${i}`,
    name: 'Project name',
    description: 'A short description of what this Project is.',
    status: 'active',
    my_role: myRole,
    tech_tags: ['stack', 'framework'],
    production_version: 'v0.0.0',
    open_task_count: 0,
    pinned_at: null,
    last_activity_at: ago(i),
  }
}

/** Three of my own Projects, two shared with me. */
export const SKETCH_CARDS: ProjectCard[] = [
  sketchCard(0, 'owner'),
  sketchCard(1, 'owner'),
  sketchCard(2, 'owner'),
  sketchCard(3, 'editor'),
  sketchCard(4, 'viewer'),
]

/** One Task created per day for 14 days, four of them due this week: an even chart and a short due log. */
export const SKETCH_TASKS: DashboardTask[] = Array.from({ length: 14 }, (_, i) => ({
  id: `sketch-task-${i}`,
  project_id: `sketch-${i % 3}`,
  title: 'Task title',
  priority: 'medium',
  due_date: i < 4 ? isoDate(new Date(Date.now() + (i + 1) * DAY)) : null,
  assignee_id: null,
  created_at: ago(13 - i),
  is_done: false,
}))
