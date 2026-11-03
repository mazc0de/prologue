import { ArrowUpRight } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { RolePill } from '@/components/badges'
import { Bar } from '@/components/Loading'
import { useRevealKey } from '@/components/plot-reveal'
import { StatusGlyph } from '@/components/StatusGlyph'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useBoard } from '@/features/board/queries'
import { sketchBoard } from '@/features/board/sketch'
import { useRepositories } from '@/features/project/queries'
import { sketchRepository } from '@/features/project/sketch'
import { formatDueDate, isoDate, pluralize, relativeTime, todayISODate } from '@/lib/format'
import type { ProjectCard } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { DashboardTask } from './queries'

/* Dashboard pieces in the e-ink language (DESIGN.md): hairlines, mono data, ink glyphs, red only for overdue. */

export function Micro({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('micro', className)}>{children}</span>
}

export function SectionLabel({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Micro>{label}</Micro>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ stat strip */

export interface Stat {
  label: string
  value: number | string
  note?: ReactNode
  failed?: boolean
}

/** Hairline-divided strip of figures: micro label over a mono value. */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <Card className="grid grid-cols-2 gap-px overflow-hidden bg-border py-0 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-1 bg-card px-4 py-3.5">
          <Micro>{s.label}</Micro>
          <span className={cn('data text-2xl leading-8 font-medium', s.failed && 'text-destructive')}>{s.value}</span>
          {s.note && <span className={cn('data text-[11px] text-faint', s.failed && 'text-destructive')}>{s.note}</span>}
        </div>
      ))}
    </Card>
  )
}

/* ------------------------------------------------------------------ hero: latest Project + Board strip */

/**
 * The most recently active Project: status, Production Version, Repository link, Tags and a
 * meta line on the left; its Board as a "pipeline" of Columns on the right, whose Task counts sum
 * exactly to the total in the caption.
 */
export function HeroProject({
  card,
  progress,
  sketch = false,
}: {
  card: ProjectCard
  progress?: { done: number; total: number }
  /** A placeholder card while the dashboard is sketched: draw a placeholder Repository and Board, fetch nothing. */
  sketch?: boolean
}) {
  const repos = useRepositories(card.id, !sketch)
  const board = useBoard(card.id, !sketch)
  const revealKey = useRevealKey()
  const repo = sketch ? sketchRepository(card.id) : repos.data?.[0]
  const boardData = sketch ? sketchBoard(card.id) : board.data
  const columns = boardData?.columns ?? []
  const counts = columns.map((c) => (boardData?.tasks ?? []).filter((t) => t.column_id === c.id).length)
  const total = counts.reduce((a, b) => a + b, 0)
  const open = card.open_task_count ?? 0

  return (
    <Card className="grain gap-0 py-0">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-3">
          <Micro>Latest activity</Micro>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link to={`/projects/${card.id}`} className="text-xl leading-7 font-semibold hover:underline">
              {card.name}
            </Link>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <StatusGlyph kind="filled" /> Active
            </span>
            <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
            <span className="data text-sm">{card.production_version ?? 'not released'}</span>
          </div>
          {repo ? (
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer noopener"
              className="data inline-flex max-w-full items-center gap-1 self-start text-sm underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              <span className="truncate">{repo.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
              <ArrowUpRight className="size-3.5 flex-none" />
            </a>
          ) : (
            <span className="data text-sm text-faint">no repository</span>
          )}
          {card.tech_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.tech_tags.slice(0, 5).map((t, i) => (
                <Badge key={revealKey(t, i)} variant="outline" className="data bg-card font-normal">
                  {t}
                </Badge>
              ))}
            </div>
          )}
          <p className="data text-xs text-faint">
            {open} open · {progress ? `${progress.done}/${progress.total} done` : '–'} · active {relativeTime(card.last_activity_at)}
          </p>
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-3">
          <Micro>Board</Micro>
          {!boardData ? (
            <Bar className="h-14 w-full" />
          ) : columns.length === 0 ? (
            <p className="data text-xs text-faint">no columns</p>
          ) : (
            <>
              <div className="overflow-x-auto pb-1">
                <ol className="relative flex min-w-max justify-between gap-4" aria-label="Tasks per Column">
                  {/* The rail runs through the dot centreline (dot 12px → 6px) and passes behind the dots. */}
                  <span aria-hidden className="absolute inset-x-[6px] top-[6px] h-px bg-border" />
                  {columns.map((c, i) => (
                    <li key={revealKey(c.id, i)} className="relative flex min-w-16 flex-col items-center gap-2 first:items-start last:items-end">
                      <span className="flex rounded-full bg-card outline-4 outline-card">
                        <StatusGlyph kind={counts[i] ? 'filled' : 'empty'} />
                      </span>
                      <span className="micro text-[10px] text-foreground">{c.name}</span>
                      <span className="data -mt-1 text-xs text-muted-foreground">{counts[i]}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="data text-right text-xs text-faint">
                {columns.length} columns · total {pluralize(total, 'Task')}
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ Projects table */

/** Dense hairline table of Projects. A Project with overdue Tasks is the only red row. */
export function ProjectsTable({
  cards,
  progress,
  overdueByProject,
}: {
  cards: ProjectCard[]
  progress: Map<string, { done: number; total: number }>
  overdueByProject: Map<string, number>
}) {
  const revealKey = useRevealKey()
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b text-left">
              {['Status', 'Project', 'Tech', 'Production', 'Open', 'Done', 'Activity', 'Role'].map((h) => (
                <th key={h} scope="col" className="micro h-9 px-4 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {cards.map((c, i) => {
              const overdue = overdueByProject.get(c.id) ?? 0
              const p = progress.get(c.id)
              return (
                <tr key={revealKey(c.id, i)} className="h-11 transition-colors hover:bg-accent">
                  <td className="w-28 px-4">
                    <span className={cn('inline-flex items-center gap-2 text-xs font-medium', overdue > 0 && 'text-destructive')}>
                      <StatusGlyph kind={overdue ? 'failed' : 'filled'} />
                      {overdue ? 'Overdue' : 'Active'}
                    </span>
                  </td>
                  <td className="max-w-[260px] px-4">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <Link to={`/projects/${c.id}`} className="truncate font-medium hover:underline">
                        {c.name}
                      </Link>
                      {overdue > 0 && <span className="data flex-none text-xs text-destructive">{overdue} overdue</span>}
                    </div>
                  </td>
                  <td className="px-4">
                    {c.tech_tags[0] ? (
                      <Badge variant="outline" className="data bg-card font-normal">
                        {c.tech_tags[0]}
                        {c.tech_tags.length > 1 && <span className="text-faint">+{c.tech_tags.length - 1}</span>}
                      </Badge>
                    ) : (
                      <span className="data text-faint">--</span>
                    )}
                  </td>
                  <td className="data px-4">{c.production_version ?? <span className="text-faint">--</span>}</td>
                  <td className="data px-4">{c.open_task_count ?? 0}</td>
                  <td className="data px-4 text-muted-foreground">{p ? `${p.done}/${p.total}` : '--'}</td>
                  <td className="data px-4 text-muted-foreground" title={new Date(c.last_activity_at).toLocaleString()}>
                    {relativeTime(c.last_activity_at)}
                  </td>
                  <td className="px-4">
                    {c.my_role === 'owner' ? <span className="data text-xs text-faint">owner</span> : <RolePill role={c.my_role} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ due log */

/** Upcoming due dates as a mono log excerpt; overdue Tasks form the red tail, the only chroma here. */
export function DueLog({ tasks, cardById }: { tasks: DashboardTask[]; cardById: Map<string, ProjectCard> }) {
  const revealKey = useRevealKey()
  const today = todayISODate()
  const weekAhead = isoDate(new Date(Date.now() + 7 * 864e5))
  const open = tasks.filter((t) => !t.is_done && t.due_date)
  const overdue = open.filter((t) => t.due_date! < today).sort((a, b) => a.due_date!.localeCompare(b.due_date!))
  const upcoming = open
    .filter((t) => t.due_date! >= today && t.due_date! <= weekAhead)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
  const tail = overdue.slice(0, 4)
  const head = upcoming.slice(0, Math.max(0, 9 - tail.length))

  const line = (t: DashboardTask, failed: boolean, i: number) => (
    <Link
      key={revealKey(t.id, i)}
      to={`/projects/${t.project_id}`}
      className={cn('flex gap-3 whitespace-pre hover:underline', failed ? 'text-destructive' : 'text-muted-foreground')}
    >
      <span className={failed ? undefined : 'text-faint'}>[{formatDueDate(t.due_date!)}]</span>
      <span className="w-14 flex-none">{failed ? 'overdue' : t.due_date === today ? 'today' : 'due'}</span>
      <span className={cn(!failed && 'text-foreground')}>
        {cardById.get(t.project_id)?.name ?? 'Project'} · {t.title}
      </span>
    </Link>
  )

  return (
    <Card className="min-w-0 gap-3 p-5">
      <div className="flex items-center gap-3">
        <Micro>Due this week</Micro>
        <Separator orientation="vertical" className="data-[orientation=vertical]:h-3.5" />
        <span className={cn('data text-xs', overdue.length ? 'text-destructive' : 'text-faint')}>
          {overdue.length} overdue · {upcoming.length} upcoming
        </span>
      </div>
      <div className="data overflow-x-auto rounded-md border bg-background p-4 text-xs leading-[1.6]">
        {head.length + tail.length === 0 ? (
          <span className="text-faint">[{formatDueDate(today)}] nothing due in the next 7 days</span>
        ) : (
          <div className="flex min-w-max flex-col">
            {head.map((t, i) => line(t, false, i))}
            {tail.map((t, i) => line(t, true, head.length + i))}
            {overdue.length > tail.length && <span className="text-destructive">… {overdue.length - tail.length} more overdue</span>}
          </div>
        )}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ stepped ink bars */

const dayFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })

/** Tasks created per day over 14 days: thin solid-ink bars on a hairline baseline, no gridlines. */
export function CreatedChart({ tasks, sketch = false }: { tasks: DashboardTask[]; sketch?: boolean }) {
  const days = useMemo(() => {
    const now = new Date()
    const buckets = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i))
      return { iso: isoDate(d), label: dayFmt.format(d), created: 0, done: 0 }
    })
    const index = new Map(buckets.map((b, i) => [b.iso, i]))
    for (const t of tasks) {
      const i = index.get(isoDate(new Date(t.created_at)))
      if (i === undefined) continue
      buckets[i].created += 1
      if (t.is_done) buckets[i].done += 1
    }
    return buckets
  }, [tasks])
  const created = days.reduce((s, d) => s + d.created, 0)
  const done = days.reduce((s, d) => s + d.done, 0)
  // The sketch's even bars stand at half height, so the pencil visibly adjusts to the real counts.
  const max = sketch ? 2 : Math.max(1, ...days.map((d) => d.created))

  return (
    <Card className="min-w-0 gap-3 p-5">
      <Micro>Tasks created · last 14 days</Micro>
      <div
        className="flex h-[140px] items-end justify-between gap-1 border-b px-1"
        role="img"
        aria-label={`${created} Tasks created in the last 14 days`}
      >
        {days.map((d) => (
          <div
            key={d.iso}
            className="group flex h-full flex-1 items-end justify-center"
            title={`${d.label}: ${d.created} created, ${d.done} done`}
          >
            <span
              className="w-[5px] rounded-t-[1px] bg-foreground transition-opacity group-hover:opacity-60"
              style={{ height: d.created ? `${(d.created / max) * 100}%` : 1 }}
            />
          </div>
        ))}
      </div>
      <div className="data flex justify-between text-[11px] text-faint">
        <span>14d ago</span>
        <span>7d ago</span>
        <span>Today</span>
      </div>
      <p className="data text-xs">
        {sketch ? 0 : created} created <span className="text-faint">·</span> {done} done <span className="text-faint">·</span>{' '}
        {created ? Math.round((done / created) * 100) : 0}% done
      </p>
    </Card>
  )
}
