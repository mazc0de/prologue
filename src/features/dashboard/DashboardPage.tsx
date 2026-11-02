import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { Bar, BlockError } from '@/components/Loading'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/layout/PageHeader'
import { errorMessage } from '@/lib/errors'
import { todayISODate } from '@/lib/format'
import { NewProjectDialog } from './NewProjectDialog'
import { sortCards, useDashboardTasks, useProjectCards } from './queries'
import { progressByProject } from './stats'
import { CreatedChart, DueLog, HeroProject, ProjectsTable, SectionLabel, StatStrip } from './widgets'

/*
 * Dashboard in the e-ink layout of DESIGN.md: header bar, a dot-grain hero card for the most recently
 * active Project (its Board drawn as a pipeline strip), a stat strip, a dense Projects table, then a
 * split row of the due-date log and the 14-day ink bar chart. Only Active Projects count here.
 */
export function DashboardPage() {
  const { profile } = useAuth()
  const { data: cards, isPending, error, refetch } = useProjectCards()
  const tasksQuery = useDashboardTasks()
  const [creating, setCreating] = useState(false)

  const active = useMemo(() => sortCards((cards ?? []).filter((c) => c.status === 'active')), [cards])
  const activeIds = useMemo(() => new Set(active.map((c) => c.id)), [active])
  const tasks = useMemo(() => (tasksQuery.data ?? []).filter((t) => activeIds.has(t.project_id)), [tasksQuery.data, activeIds])
  const progress = useMemo(() => progressByProject(tasksQuery.data ?? []), [tasksQuery.data])
  const cardById = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c])), [cards])
  const latest = useMemo(() => [...active].sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at))[0], [active])

  const today = todayISODate()
  const overdueByProject = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tasks) {
      if (!t.is_done && t.due_date && t.due_date < today) map.set(t.project_id, (map.get(t.project_id) ?? 0) + 1)
    }
    return map
  }, [tasks, today])
  const overdue = [...overdueByProject.values()].reduce((a, b) => a + b, 0)
  const openTasks = active.reduce((sum, c) => sum + (c.open_task_count ?? 0), 0)
  const inactive = (cards ?? []).length - active.length
  const released = active.filter((c) => c.production_version).length
  const who = profile?.display_name.trim().split(/\s+/)[0]?.toLowerCase() || 'prologue'

  return (
    <>
      <PageHeader
        crumbs={[{ label: who }, { label: 'Dashboard' }]}
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> New Project
          </Button>
        }
      />
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6">
        {error ? (
          <BlockError message={`Couldn't load your Projects. ${errorMessage(error)}`} onRetry={() => refetch()} />
        ) : isPending ? (
          <Bar className="h-48 w-full rounded-lg" />
        ) : active.length === 0 ? (
          <FirstRun hasInactive={inactive > 0} onCreate={() => setCreating(true)} />
        ) : (
          <>
            {latest && <HeroProject card={latest} progress={progress.get(latest.id)} />}

            <StatStrip
              loading={tasksQuery.isPending}
              stats={[
                { label: 'Active Projects', value: active.length, note: `${inactive} inactive` },
                { label: 'Open Tasks', value: openTasks, note: `${tasks.length} total` },
                { label: 'Overdue', value: overdue, note: overdue ? 'past due date' : 'none', failed: overdue > 0 },
                { label: 'In Production', value: released, note: `of ${active.length} released` },
              ]}
            />

            {tasksQuery.error && (
              <BlockError message={`Couldn't load Tasks. ${errorMessage(tasksQuery.error)}`} onRetry={() => tasksQuery.refetch()} />
            )}

            <section aria-label="Active Projects" className="flex flex-col gap-2.5">
              <SectionLabel
                label="Active Projects"
                action={
                  <Link
                    to="/projects"
                    className="data text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
                  >
                    all {cards?.length ?? 0} →
                  </Link>
                }
              />
              <ProjectsTable cards={active.slice(0, 10)} progress={progress} overdueByProject={overdueByProject} />
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <DueLog tasks={tasks} cardById={cardById} loading={tasksQuery.isPending} />
              <CreatedChart tasks={tasks} loading={tasksQuery.isPending} />
            </div>
          </>
        )}
      </div>
      {creating && <NewProjectDialog open onClose={() => setCreating(false)} />}
    </>
  )
}

function FirstRun({ hasInactive, onCreate }: { hasInactive: boolean; onCreate: () => void }) {
  return (
    <Card className="grain gap-4 p-6 sm:p-8">
      <span className="micro">Start here</span>
      <h1 className="text-xl font-semibold">{hasInactive ? 'No Active Projects' : 'Start your log with a Project'}</h1>
      <p className="max-w-[60ch] text-sm text-muted-foreground">
        {hasInactive
          ? 'Every Project you have is Inactive. Set one back to Active, or start a new one.'
          : "Add where the code lives, where it runs and which Version is out, then track what's left on its Board."}
      </p>
      <div className="flex gap-2">
        <Button onClick={onCreate}>
          <Plus /> New Project
        </Button>
        {hasInactive && (
          <Button variant="ghost" asChild>
            <Link to="/projects?status=inactive">Inactive Projects</Link>
          </Button>
        )}
      </div>
    </Card>
  )
}
