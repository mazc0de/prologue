import { Badge } from '@/components/ui/badge'
import { StatusGlyph, type Glyph } from './StatusGlyph'
import type { EnvironmentKind, LabelColor, ProjectRole, ProjectStatus, TaskPriority } from '@/lib/types'
import { capitalize } from '@/lib/types'
import { cn } from '@/lib/utils'

/* Domain marks in the ink language: a glyph carries the state, the word says it too. */

const STATUS_GLYPH: Record<ProjectStatus, Glyph> = { active: 'filled', inactive: 'dashed' }

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', status === 'inactive' && 'text-muted-foreground')}>
      <StatusGlyph kind={STATUS_GLYPH[status]} size={10} />
      {capitalize(status)}
    </span>
  )
}

export function RolePill({ role }: { role: ProjectRole }) {
  return (
    <Badge variant="outline" className="data font-normal text-muted-foreground">
      {role}
    </Badge>
  )
}

/** Environment Kind as an ink glyph: Production filled, Staging half, Development empty, Preview dashed. */
export const KIND_GLYPH: Record<EnvironmentKind, Glyph> = {
  production: 'filled',
  staging: 'half',
  development: 'empty',
  preview: 'dashed',
  other: 'empty',
}

export function KindPill({ kind }: { kind: EnvironmentKind }) {
  return (
    <span className="inline-flex flex-none items-center gap-1.5 text-xs font-medium">
      <StatusGlyph kind={KIND_GLYPH[kind]} size={10} />
      {capitalize(kind)}
    </span>
  )
}

/** The 9 preset Label colours. In the ink language the colour survives only as a small dot. */
export const LABEL_STYLE = Object.fromEntries(
  (['gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'] as const).map((c) => [
    c,
    { dot: `var(--label-${c})` },
  ]),
) as Record<LabelColor, { dot: string }>

export function LabelChip({ name, color, className }: { name: string; color: string; className?: string }) {
  const style = LABEL_STYLE[(color as LabelColor) in LABEL_STYLE ? (color as LabelColor) : 'gray']
  return (
    <Badge variant="outline" className={cn('max-w-full gap-1.5 bg-card font-normal', className)}>
      <span aria-hidden className="size-1.5 flex-none rounded-full" style={{ background: style.dot }} />
      <span className="truncate">{name}</span>
    </Badge>
  )
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-muted-foreground',
  high: 'text-foreground',
  urgent: 'text-foreground font-semibold',
}

/** Priority glyph: bars filled to the level; colour only for High and Urgent. */
export function PriorityMark({ priority, withLabel }: { priority: TaskPriority; withLabel?: boolean }) {
  const level = { low: 1, medium: 2, high: 3, urgent: 4 }[priority]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', PRIORITY_STYLE[priority])} title={`${capitalize(priority)} priority`}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={i * 3}
            y={9 - i * 3}
            width="2"
            height={3 + i * 3}
            rx="0.5"
            fill="currentColor"
            opacity={i < level ? 1 : 0.22}
          />
        ))}
      </svg>
      {withLabel ? capitalize(priority) : <span className="sr-only">{capitalize(priority)} priority</span>}
    </span>
  )
}
