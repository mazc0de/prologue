import { Pin } from 'lucide-react'
import { Link } from 'react-router'
import { ProjectStatusPill, RolePill } from '@/components/badges'
import { useRevealKey } from '@/components/plot-reveal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/format'
import type { ProjectCard } from '@/lib/types'
import { ProjectMark } from './ProjectMark'
import { useTogglePin } from './queries'

/** Shared by the dashboard's Recent Projects and the Projects page. */

export function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
}

export function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex min-h-12 items-center rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
      {children}
    </p>
  )
}

/** Strip markdown syntax for the one-line card preview. */
function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:[-*+]|\d+\.|#{1,6}|>)\s+/gm, ' ')
    .replace(/[*_`~|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function ProjectCardView({ card, progress }: { card: ProjectCard; progress?: { done: number; total: number } }) {
  const togglePin = useTogglePin()
  const revealKey = useRevealKey()
  const pinned = Boolean(card.pinned_at)
  const description = plainText(card.description)
  const tags = card.tech_tags.slice(0, 4)
  const moreTags = card.tech_tags.length - tags.length
  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <Card className="group relative min-h-[224px] gap-0 p-5 transition-colors hover:border-foreground/40">
      <div className="flex items-start gap-3.5">
        <ProjectMark id={card.id} name={card.name} size={36} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-base font-semibold">
            <Link to={`/projects/${card.id}`} className="block truncate after:absolute after:inset-0 after:rounded-lg">
              {card.name}
            </Link>
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <ProjectStatusPill status={card.status} />
            {card.my_role !== 'owner' && <RolePill role={card.my_role} />}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={pinned}
          aria-label={pinned ? `Unpin ${card.name}` : `Pin ${card.name}`}
          title={pinned ? 'Unpin' : 'Pin to top'}
          onClick={() => togglePin.mutate({ projectId: card.id, pinned: !pinned }, { onError: notify.error })}
          className={cn(
            'relative z-10 -mt-1 -mr-1 flex-none',
            pinned ? 'text-foreground' : 'text-faint opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100',
          )}
        >
          <Pin size={16} strokeWidth={1.75} fill={pinned ? 'currentColor' : 'none'} />
        </Button>
      </div>

      <p className={cn('mt-3 line-clamp-2 text-sm', description ? 'text-muted-foreground' : 'text-faint')}>
        {description || 'No description'}
      </p>

      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
          {tags.map((t, i) => (
            <li key={revealKey(t, i)}>
              <Badge variant="outline" className="data bg-card font-normal">
                {t}
              </Badge>
            </li>
          ))}
          {moreTags > 0 && <li className="data inline-flex items-center text-xs text-faint">+{moreTags}</li>}
        </ul>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-5">
        <div className="flex items-center justify-between">
          <span className="micro">Tasks done</span>
          <span className="data text-xs text-muted-foreground">
            {progress?.total ? `${progress.done}/${progress.total} · ${pct}%` : '--'}
          </span>
        </div>
        <Progress value={pct} aria-label="Tasks done" />
      </div>

      <div className="data mt-4 flex items-center gap-2 border-t pt-3 text-xs text-faint">
        {card.production_version ? (
          <Badge variant="outline" className="data min-w-0 bg-card font-medium text-foreground" title={`Production ${card.production_version}`}>
            <span className="truncate">{card.production_version}</span>
          </Badge>
        ) : (
          <span className="truncate">not released</span>
        )}
        <span>·</span>
        <span className="flex-none">
          <span className="text-foreground">{card.open_task_count ?? 0}</span> open
        </span>
        <span className="ml-auto truncate" title={new Date(card.last_activity_at).toLocaleString()}>
          {relativeTime(card.last_activity_at)}
        </span>
      </div>
    </Card>
  )
}
