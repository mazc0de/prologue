import type { ReactNode } from 'react'

export function SectionHeader({
  id,
  title,
  count,
  action,
}: {
  id: string
  title: string
  count?: number
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <h2 id={id} className="flex items-baseline gap-2">
        <span className="micro">{title}</span>
        {count !== undefined && <span className="data text-[11px] text-faint">{count}</span>}
      </h2>
      {action || null}
    </div>
  )
}
