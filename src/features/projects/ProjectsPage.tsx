import { ChevronDown, Plus, Search, Tag, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { BlockError, LoadingReveal } from '@/components/Loading'
import { useRevealKey } from '@/components/plot-reveal'
import { Segmented } from '@/components/Segmented'
import { PageHeader } from '@/layout/PageHeader'
import { NewProjectDialog } from '@/features/dashboard/NewProjectDialog'
import { CardGrid, EmptyLine, ProjectCardView } from '@/features/dashboard/ProjectCards'
import { sortCards, useDashboardTasks, useProjectCards, useTagSuggestions, type DashboardTask } from '@/features/dashboard/queries'
import { SKETCH_CARDS, SKETCH_TASKS } from '@/features/dashboard/sketch'
import { matchesQuery, matchesTags, progressByProject } from '@/features/dashboard/stats'
import { errorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/format'
import { cn } from '@/lib/utils'
import { capitalize, PROJECT_STATUSES, type ProjectCard, type ProjectStatus } from '@/lib/types'

type Filter = ProjectStatus | 'all'

const FILTERS: Filter[] = [...PROJECT_STATUSES, 'all']

function matchesStatus(card: ProjectCard, filter: Filter) {
  return filter === 'all' || card.status === filter
}

/**
 * `/projects`: every Project as a card, nothing else. Status tabs, the Tag filter and the search
 * field (`?status=`, `?tag=` repeated, `?q=` shared with the sidebar search) narrow the list; My Projects and Shared with me stay separate.
 * The first load is sketched in pencil (LoadingReveal) from placeholder cards, unfiltered.
 */
export function ProjectsPage() {
  const { data: cards, isPending, error, refetch } = useProjectCards()
  const tasksQuery = useDashboardTasks()
  const [params, setParams] = useSearchParams()
  const filter = (FILTERS.includes(params.get('status') as Filter) ? params.get('status') : 'active') as Filter
  const q = params.get('q')?.trim() ?? ''
  const tagParam = params.getAll('tag').join('\n')
  const tags = useMemo(() => (tagParam ? tagParam.split('\n') : []), [tagParam])
  const tagOptions = useTagSuggestions()
  const [creating, setCreating] = useState(false)

  const visible = useMemo(
    () => sortCards((cards ?? []).filter((c) => matchesStatus(c, filter) && matchesQuery(c, q) && matchesTags(c, tags))),
    [cards, filter, q, tags],
  )

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const setTags = (next: string[]) => {
    const nextParams = new URLSearchParams(params)
    nextParams.delete('tag')
    for (const t of next) nextParams.append('tag', t)
    setParams(nextParams, { replace: true })
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
              count: cards
                ? cards.filter((c) => matchesStatus(c, f) && matchesQuery(c, q) && matchesTags(c, tags)).length
                : undefined,
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
        <div className="flex w-full min-w-0 items-center gap-2 sm:ml-auto sm:w-auto">
          <TagFilter options={tagOptions} selected={tags} onChange={setTags} />
          <InputGroup className="h-8 min-w-0 flex-1 bg-card sm:w-80 sm:flex-none dark:bg-card">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Filter Projects"
              placeholder="Filter by name, description or Tag…"
              value={params.get('q') ?? ''}
              onChange={(e) => setParam('q', e.target.value || null)}
              onKeyDown={(e) => e.key === 'Escape' && q && setParam('q', null)}
              className="text-sm [&::-webkit-search-cancel-button]:appearance-none"
            />
            {q && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-xs" aria-label="Clear search" title="Clear search" onClick={() => setParam('q', null)}>
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
      </div>

      {error ? (
        <BlockError message={`Couldn't load your Projects. ${errorMessage(error)}`} onRetry={() => refetch()} />
      ) : (
        <LoadingReveal pending={isPending || tasksQuery.isPending} className="flex flex-col gap-6">
          {(sketch) => (
            <Groups
              cards={sketch ? SKETCH_CARDS : visible}
              tasks={sketch ? SKETCH_TASKS : (tasksQuery.data ?? [])}
              filter={filter}
              filtered={Boolean(q) || tags.length > 0}
            />
          )}
        </LoadingReveal>
      )}

    </div>
      {creating && <NewProjectDialog open onClose={() => setCreating(false)} />}
    </>
  )
}

function Groups({
  cards,
  tasks,
  filter,
  filtered,
}: {
  cards: ProjectCard[]
  tasks: DashboardTask[]
  filter: Filter
  /** A search or Tag filter is narrowing the list. */
  filtered: boolean
}) {
  const revealKey = useRevealKey()
  const progress = useMemo(() => progressByProject(tasks), [tasks])
  const mine = cards.filter((c) => c.my_role === 'owner')
  const shared = cards.filter((c) => c.my_role !== 'owner')

  return (
    <>
      <Group title="My Projects" count={mine.length}>
        {mine.length ? (
          <CardGrid>
            {mine.map((c, i) => (
              <ProjectCardView key={revealKey(c.id, i)} card={c} progress={progress.get(c.id)} />
            ))}
          </CardGrid>
        ) : (
          <EmptyLine>
            {filtered
              ? 'None of your Projects match these filters.'
              : filter === 'all'
                ? 'You have no Projects of your own yet.'
                : `None of your Projects are ${filter}.`}
          </EmptyLine>
        )}
      </Group>
      <Group title="Shared with me" count={shared.length}>
        {shared.length ? (
          <CardGrid>
            {shared.map((c, i) => (
              <ProjectCardView key={revealKey(c.id, i)} card={c} progress={progress.get(c.id)} />
            ))}
          </CardGrid>
        ) : (
          <EmptyLine>
            {filtered
              ? 'No shared Projects match these filters.'
              : filter === 'inactive'
                ? 'No shared Projects are inactive.'
                : 'Projects you accept an Invitation to appear here.'}
          </EmptyLine>
        )}
      </Group>
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

/** Multi-select Tag filter: a Project must carry every checked Tag. The menu stays open while ticking. */
function TagFilter({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (tags: string[]) => void }) {
  const isSelected = (tag: string) => selected.some((s) => s.toLowerCase() === tag.toLowerCase())
  // Keep Tags from the URL visible even if no Project uses them any more, so they can be unticked.
  const all = [...options, ...selected.filter((s) => !options.some((o) => o.toLowerCase() === s.toLowerCase()))]

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={selected.length ? `Filtered by Tags: ${selected.join(', ')}` : 'Filter by Tag'}
          className={cn('h-8 max-w-48 min-w-0 flex-none bg-card dark:bg-card', selected.length > 0 && 'border-foreground/60')}
        >
          <Tag />
          <span className="truncate">{selected.length ? selected.join(', ') : 'Tags'}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
        <DropdownMenuLabel className="micro">Filter by Tag</DropdownMenuLabel>
        {all.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">No Tags yet.</p>
        ) : (
          all.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag}
              checked={isSelected(tag)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(on) =>
                onChange(on ? [...selected, tag] : selected.filter((s) => s.toLowerCase() !== tag.toLowerCase()))
              }
            >
              <span className="truncate">{tag}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              <X /> Clear Tags
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
