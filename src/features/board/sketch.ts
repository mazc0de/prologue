import type { BoardData, BoardTask } from './queries'

/*
 * Placeholder Board for the pencil-sketch loading state (LOADING_DESIGN.md): the default Columns,
 * a couple of Tasks in each open one.
 */

const NOW = new Date().toISOString()
const COLUMNS = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done']

export function sketchBoard(projectId: string): BoardData {
  const columns = COLUMNS.map((name, i) => ({
    id: `sketch-column-${i}`,
    name,
    is_done: name === 'Done',
    position: i,
    project_id: projectId,
    created_at: NOW,
  }))
  const tasks: BoardTask[] = columns
    .filter((c) => !c.is_done)
    .flatMap((c, ci) =>
      Array.from({ length: ci < 2 ? 2 : 1 }, (_, i) => ({
        id: `${c.id}-task-${i}`,
        title: 'Task title',
        description: '',
        priority: 'medium' as const,
        due_date: null,
        assignee_id: null,
        column_id: c.id,
        position: i,
        project_id: projectId,
        created_at: NOW,
        created_by: null,
        updated_at: NOW,
        task_labels: [],
      })),
    )
  return { columns, tasks }
}
