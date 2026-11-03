import { ChevronsUpDown, FolderKanban, LayoutDashboard, LogOut, Search, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { Avatar } from '@/components/Avatar'
import { LogoMark } from '@/components/Logo'
import { StatusGlyph } from '@/components/StatusGlyph'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { sortCards, useDashboardTasks, useProjectCards } from '@/features/dashboard/queries'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { AccountDialog } from './AccountDialog'

/*
 * App shell in the e-ink paper language (DESIGN.md): a ~240px paper sidebar with a hairline right
 * border (wordmark, ⌘K search, nav with a 3px ink rule on the active item, Pinned / Active Projects
 * led by ink glyphs, a Tasks-done meter and the user row) beside the page. Each page draws its own
 * 52px PageHeader. Collapses to icons on desktop (⌘/Ctrl+B) and becomes a Sheet on phones.
 */
export function AppShell() {
  const defaultOpen = !document.cookie.includes('sidebar_state=false')
  return (
    <SidebarProvider defaultOpen={defaultOpen} style={{ '--sidebar-width': '15rem' } as React.CSSProperties} className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-background">
        <div id="main" className="relative min-h-0 flex-1 overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/**
 * Searches Projects by name, description and Tag. The query lives in the Projects page's URL
 * (`/projects?q=`), so typing anywhere else takes you there. ⌘K / Ctrl+K focuses it.
 */
function SearchBox() {
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { isMobile, setOpenMobile, state, setOpen } = useSidebar()
  const input = useRef<HTMLInputElement>(null)
  const onProjects = location.pathname === '/projects'
  const value = onProjects ? (params.get('q') ?? '') : ''

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      if (isMobile) setOpenMobile(true)
      else if (state === 'collapsed') setOpen(true)
      window.setTimeout(() => input.current?.focus(), 50)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobile, setOpenMobile, state, setOpen])

  const onChange = (next: string) => {
    const nextParams = new URLSearchParams(onProjects ? params : undefined)
    if (next) nextParams.set('q', next)
    else nextParams.delete('q')
    const search = nextParams.toString()
    navigate({ pathname: '/projects', search: search ? `?${search}` : '' }, { replace: onProjects })
  }

  return (
    <InputGroup className="h-8 bg-background dark:bg-background">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        ref={input}
        type="search"
        aria-label="Search Projects"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search…"
        className="text-sm"
      />
      <InputGroupAddon align="inline-end">
        <kbd className="data rounded-sm border bg-card px-1 text-[10px] leading-4 text-faint">⌘K</kbd>
      </InputGroupAddon>
    </InputGroup>
  )
}

function UserRow() {
  const { profile, userId } = useAuth()
  const [accountOpen, setAccountOpen] = useState(false)
  if (!profile || !userId) return null
  const handle = profile.email.split('@')[0]

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="lg" className="rounded-md data-[state=open]:bg-sidebar-accent">
            <Avatar userId={userId} name={profile.display_name} size={28} />
            <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
              <span className="truncate text-sm font-medium text-foreground">{profile.display_name}</span>
              <span className="data truncate text-xs text-faint">@{handle}</span>
            </span>
            <ChevronsUpDown className="text-faint" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate">{profile.display_name}</span>
            <span className="data truncate text-xs font-normal text-muted-foreground">{profile.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAccountOpen(true)}>
            <UserRound /> Account
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => supabase.auth.signOut()}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {accountOpen && <AccountDialog open onClose={() => setAccountOpen(false)} />}
    </>
  )
}

/** Quota-style meter: Tasks done across Active Projects, pure ink at any level. */
function TasksMeter({ activeIds }: { activeIds: Set<string> }) {
  const { data: tasks } = useDashboardTasks()
  const scoped = (tasks ?? []).filter((t) => activeIds.has(t.project_id))
  const done = scoped.filter((t) => t.is_done).length
  const pct = scoped.length ? (done / scoped.length) * 100 : 0
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-foreground">Tasks done</span>
        <span className="data text-[11px] text-faint">{tasks ? `${done}/${scoped.length}` : '–'}</span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-border"
        role="meter"
        aria-label="Tasks done across Active Projects"
        aria-valuemin={0}
        aria-valuemax={scoped.length}
        aria-valuenow={done}
      >
        <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function AppSidebar() {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  const { data: cards = [] } = useProjectCards()
  const sorted = useMemo(() => sortCards(cards.filter((c) => c.status === 'active')), [cards])
  const activeIds = useMemo(() => new Set(sorted.map((c) => c.id)), [sorted])
  const pinned = sorted.filter((c) => c.pinned_at)
  // Every other Active Project, A to Z, so any of them is one click away.
  const others = sorted
    .filter((c) => !c.pinned_at)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

  // The phone Sheet closes itself after navigating.
  useEffect(() => setOpenMobile(false), [pathname, setOpenMobile])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 px-3 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="rounded-md hover:bg-transparent">
              <Link to="/">
                <LogoMark size={24} className="-ml-1" />
                <span className="text-sm font-medium text-foreground">Prologue</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="group-data-[collapsible=icon]:hidden">
          <SearchBox />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem to="/" active={pathname === '/'} icon={<LayoutDashboard />} label="Dashboard" />
              <NavItem to="/projects" active={pathname === '/projects'} icon={<FolderKanban />} label="Projects" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {pinned.length > 0 && <ProjectGroup label="Pinned" items={pinned} pathname={pathname} />}
        {others.length > 0 && <ProjectGroup label="Active Projects" items={others} pathname={pathname} />}
      </SidebarContent>

      <SidebarFooter className="gap-2 px-3 pb-3">
        <TasksMeter activeIds={activeIds} />
        <SidebarMenu>
          <SidebarMenuItem>
            <UserRow />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function ProjectGroup({ label, items, pathname }: { label: string; items: { id: string; name: string }[]; pathname: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="micro">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((p) => (
            <NavItem
              key={p.id}
              to={`/projects/${p.id}`}
              active={pathname === `/projects/${p.id}`}
              icon={<span className="flex size-4 flex-none items-center justify-center"><StatusGlyph kind="filled" size={8} /></span>}
              label={p.name}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/** Nav row: plain text; the active row gets a faint fill, semibold, and a 3px ink rule on the sidebar edge. */
function NavItem({ to, active, icon, label }: { to: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={label}
        className={cn(
          'relative rounded-sm text-sidebar-foreground',
          'data-[active=true]:font-semibold data-[active=true]:before:absolute data-[active=true]:before:inset-y-0 data-[active=true]:before:-left-2 data-[active=true]:before:w-[3px] data-[active=true]:before:bg-foreground',
        )}
      >
        <Link to={to}>
          {icon}
          <span className="truncate">{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
