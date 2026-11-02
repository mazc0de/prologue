import { Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BlockError } from '@/components/Loading'
import { Segmented } from '@/components/Segmented'
import { PageHeader } from '@/layout/PageHeader'
import { NewProjectDialog } from '@/features/dashboard/NewProjectDialog'
import { CardGrid, CardSkeleton, EmptyLine, ProjectCardView } from '@/features/dashboard/ProjectCards'
import { sortCards, useDashboardTasks, useProjectCards } from '@/features/dashboard/queries'
import { matchesQuery, progressByProject } from '@/features/dashboard/stats'
import { errorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/format'
import { capitalize, PROJECT_STATUSES, type ProjectCard, type ProjectStatus } from '@/lib/types'

type Filter = ProjectStatus | 'all'

const FILTERS: Filter[] = [...PROJECT_STATUSES, 'all']

function matchesStatus(card: ProjectCard, filter: Filter) {
  return filter === 'all' || card.status === filter
}

/**
 * `/projects`: every Project as a card, nothing else. Status tabs and the top-bar search
 * (`?status=`, `?q=`) narrow the list; My Projects and Shared with me stay separate.
 */
export function ProjectsPage() {
  const { data: cards, isPending, error, refetch } = useProjectCards()
  const tasksQuery = useDashboardTasks()
  const [params, setParams] = useSearchParams()
  const filter = (FILTERS.includes(params.get('status') as Filter) ? params.get('status') : 'active') as Filter
  const q = params.get('q')?.trim() ?? ''
  const [creating, setCreating] = useState(false)

  const progress = useMemo(() => progressByProject(tasksQuery.data ?? []), [tasksQuery.data])
  const visible = useMemo(
    () => sortCards((cards ?? []).filter((c) => matchesStatus(c, filter) && matchesQuery(c, q))),
    [cards, filter, q],
  )
  const mine = visible.filter((c) => c.my_role === 'owner')
  const shared = visible.filter((c) => c.my_role !== 'owner')

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'prologue', to: '/' }, { label: 'Projects' }]}
        center={
          <Segmented
            label="Filter by status"
            value={filter}
            onChange={(f) => setParam('status', f === 'active' ? null : f)}
            options={FILTERS.map((f) => ({
              value: f,
              label: capitalize(f),
              count: cards ? (cards ?? []).filter((c) => matchesStatus(c, f) && matchesQuery(c, q)).length : undefined,
            }))}
          />
        }
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> New Project
          </Button>
        }
      />
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="data text-xs text-faint">{cards ? pluralize(visible.length, 'Project') : 'loading…'}</span>
        {q && (
          <Badge variant="outline" className="data h-6 gap-1 bg-card pr-0.5 pl-2 font-normal">
            q: “{q}”
            <Button variant="ghost" size="icon-xs" aria-label="Clear search" onClick={() => setParam('q', null)} className="size-5">
              <X />
            </Button>
          </Badge>
        )}
      </div>

      {error ? (
        <BlockError message={`Couldn't load your Projects. ${errorMessage(error)}`} onRetry={() => refetch()} />
      ) : isPending ? (
        <CardGrid>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </CardGrid>
      ) : (
        <>
          <Group title="My Projects" count={mine.length}>
            {mine.length ? (
              <CardGrid>
                {mine.map((c) => (
                  <ProjectCardView key={c.id} card={c} progress={progress.get(c.id)} />
                ))}
              </CardGrid>
            ) : (
              <EmptyLine>
                {q
                  ? 'None of your Projects match this search.'
                  : filter === 'all'
                    ? 'You have no Projects of your own yet.'
                    : `None of your Projects are ${filter}.`}
              </EmptyLine>
            )}
          </Group>
          <Group title="Shared with me" count={shared.length}>
            {shared.length ? (
              <CardGrid>
                {shared.map((c) => (
                  <ProjectCardView key={c.id} card={c} progress={progress.get(c.id)} />
                ))}
              </CardGrid>
            ) : (
              <EmptyLine>
                {q
                  ? 'No shared Projects match this search.'
                  : filter === 'inactive'
                    ? 'No shared Projects are inactive.'
                    : 'Projects you accept an Invitation to appear here.'}
              </EmptyLine>
            )}
          </Group>
        </>
      )}

    </div>
      {creating && <NewProjectDialog open onClose={() => setCreating(false)} />}
    </>
  )
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="flex items-center gap-2">
        <span className="micro">{title}</span>
        <span className="data text-[11px] text-faint">{count}</span>
      </h2>
      {children}
    </section>
  )
}
