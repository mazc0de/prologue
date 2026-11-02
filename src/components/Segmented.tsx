import type { ReactNode } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

/** Joined hairline pills (shadcn ToggleGroup); the active pill inverts to solid ink with paper text. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode; count?: number }[]
  label: string
  className?: string
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn('bg-card', className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-7 gap-1.5 px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {o.label}
          {o.count !== undefined && <span className="data opacity-60">{o.count}</span>}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
