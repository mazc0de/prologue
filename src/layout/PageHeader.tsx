import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { InvitationBell } from '@/features/invitations/InvitationBell'
import { ThemeMenu } from '@/theme/ThemeMenu'

export interface Crumb {
  label: string
  to?: string
}

/**
 * The ~52px header bar every page starts with (DESIGN.md): breadcrumb (parents in muted mono,
 * the page in semibold sans), an optional centred control, the page's actions (at most ONE solid
 * button), then the global appearance and Invitation controls.
 */
export function PageHeader({ crumbs, center, actions }: { crumbs: Crumb[]; center?: ReactNode; actions?: ReactNode }) {
  const last = crumbs.length - 1
  return (
    <header className="sticky top-0 z-20 flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background px-3 py-2 sm:px-6">
      <SidebarTrigger className="-ml-1 text-muted-foreground md:hidden" />
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="data text-faint">/</span>}
            {i === last ? (
              <span aria-current="page" className="truncate font-semibold">
                {c.label}
              </span>
            ) : c.to ? (
              <Link to={c.to} className="data truncate text-muted-foreground hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span className="data truncate text-muted-foreground">{c.label}</span>
            )}
          </Fragment>
        ))}
      </nav>
      {center && <div className="order-last w-full sm:order-none sm:w-auto">{center}</div>}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
      <Separator orientation="vertical" className="hidden data-[orientation=vertical]:h-5 sm:block" />
      <div className="flex items-center gap-0.5">
        <ThemeMenu />
        <InvitationBell />
      </div>
    </header>
  )
}
