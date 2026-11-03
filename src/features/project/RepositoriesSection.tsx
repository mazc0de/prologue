import { ChevronDown, Ellipsis, ExternalLink, FileKey, GitBranch, Pencil, Plus, Rocket, Trash } from 'lucide-react'
import { useState } from 'react'
import { KindPill } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { BlockError } from '@/components/Loading'
import { usePlotPhase, useRevealKey } from '@/components/plot-reveal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProviderIcon } from '@/components/ProviderIcon'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'
import { formatDateTime, relativeTime } from '@/lib/format'
import type { EnvironmentVersion } from '@/lib/types'
import { EnvironmentDialog, RepositoryDialog } from './deploymentDialogs'
import { EnvFileDialog } from './EnvFileDialog'
import {
  useDeleteEnvironment,
  useDeleteRepository,
  useEnvironmentVersions,
  useRepositories,
  type EnvironmentSummary,
  type RepositoryTree,
} from './queries'
import { ReleaseDialog, ReleaseHistory } from './releases'
import { SectionHeader } from './SectionHeader'
import { sketchRepository, sketchVersions } from './sketch'

/** A Project has at most one Repository (see migration 20261102010000_single_repository). */
export function RepositoriesSection({ projectId, editable }: { projectId: string; editable: boolean }) {
  const repos = useRepositories(projectId)
  const versions = useEnvironmentVersions(projectId)
  const [adding, setAdding] = useState(false)
  // While the Project page is sketched, draw a placeholder Repository; ProjectPage holds the reveal until this loads.
  const sketch = usePlotPhase() === 'sketch'
  const repo = sketch ? sketchRepository(projectId) : repos.data?.[0]
  const versionMap = sketch && repo ? sketchVersions(repo) : versions.data

  return (
    <section aria-labelledby="repos-heading" className="flex flex-col gap-4">
      <SectionHeader
        id="repos-heading"
        title="Repository"
        action={
          editable &&
          repos.data &&
          !repo && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus size={14} strokeWidth={2} /> Add Repository
            </Button>
          )
        }
      />

      {repos.error && !sketch ? (
        <BlockError message={`Couldn't load the Repository. ${errorMessage(repos.error)}`} onRetry={() => repos.refetch()} />
      ) : !repo ? (
        <p className="rounded-md border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground">
          No Repository yet.{' '}
          {editable
            ? 'Add one with the branches its Production and Development Environments deploy from.'
            : 'An Editor can add one.'}
        </p>
      ) : (
        <RepositoryBlock repo={repo} projectId={projectId} editable={editable} versions={versionMap} />
      )}

      {adding && <RepositoryDialog projectId={projectId} onClose={() => setAdding(false)} />}
    </section>
  )
}

interface RepositoryBlockProps {
  repo: RepositoryTree
  projectId: string
  editable: boolean
  versions?: Map<string, EnvironmentVersion>
}

function RepositoryBlock({ repo, projectId, editable, versions }: RepositoryBlockProps) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addingEnv, setAddingEnv] = useState(false)
  const del = useDeleteRepository(projectId)
  const revealKey = useRevealKey()

  return (
    <article className="rounded-md border bg-card" aria-label={`Repository ${repo.name}`}>
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <ProviderIcon provider={repo.provider ?? 'other'} />
        <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
          <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <span className="truncate">{repo.name}</span>
          </h3>
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="truncate font-mono">{repo.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
            <ExternalLink size={12} className="flex-none" aria-hidden />
          </a>
        </div>
        {editable && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${repo.name}`} title={`Actions for ${repo.name}`}>
                <Ellipsis size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <Pencil size={14} strokeWidth={1.75} className="text-muted-foreground" /> Edit Repository
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAddingEnv(true)}>
                  <Plus size={14} strokeWidth={1.75} className="text-muted-foreground" /> Add Environment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                  <Trash size={14} strokeWidth={1.75} /> Delete Repository
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {repo.environments.length === 0 ? (
        <p className="border-t border-border/60 px-5 py-3 text-sm text-muted-foreground">
          No Environments.
          {editable && (
            <>
              {' '}
              <button type="button" className="font-medium text-foreground hover:underline" onClick={() => setAddingEnv(true)}>
                Add one
              </button>
            </>
          )}
        </p>
      ) : (
        <ul className="flex flex-col">
          {repo.environments.map((env, i) => (
            <EnvironmentRow
              key={revealKey(env.id, i)}
              env={env}
              projectId={projectId}
              editable={editable}
              version={versions?.get(env.id)}
            />
          ))}
        </ul>
      )}

      {editing && <RepositoryDialog projectId={projectId} repository={repo} onClose={() => setEditing(false)} />}
      {addingEnv && <EnvironmentDialog projectId={projectId} repositoryId={repo.id} onClose={() => setAddingEnv(false)} />}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete Repository"
        confirmLabel="Delete"
        body={
          <p>
            Delete <strong className="font-medium">{repo.name}</strong> and its {repo.environments.length} Environment
            {repo.environments.length === 1 ? '' : 's'}, their .env files and Releases?
          </p>
        }
        onConfirm={() => del.mutateAsync(repo.id)}
      />
    </article>
  )
}

/*
 * One Environment as a ledger row: Kind · name · branch | Version (the latest
 * Release) · when | .env | actions. Expanding shows the release history.
 */
function EnvironmentRow({
  env,
  projectId,
  editable,
  version,
}: {
  env: EnvironmentSummary
  projectId: string
  editable: boolean
  version?: EnvironmentVersion
}) {
  const [open, setOpen] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [viewingEnv, setViewingEnv] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const del = useDeleteEnvironment(projectId)

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
    <li className="border-t border-border/60">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <KindPill kind={env.kind} />
            {/* The default Environments are named after their Kind; don't print it twice. */}
            {env.name.trim().toLowerCase() !== env.kind && <span className="truncate text-sm font-medium">{env.name}</span>}
          </div>
          <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <GitBranch size={12} className="flex-none" aria-hidden />
            <span className="truncate font-mono">{env.branch}</span>
          </span>
        </div>

        <div className="col-start-2 row-start-1 flex flex-col items-end md:col-start-auto md:row-start-auto md:items-start">
          {version ? (
            <>
              <span className="max-w-full truncate font-mono text-[15px] leading-5 font-medium" title={version.version}>
                {version.version}
              </span>
              <span className="text-xs text-muted-foreground" title={formatDateTime(version.released_at)}>
                {relativeTime(version.released_at)}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">—</span>
              <span className="text-xs text-muted-foreground">No Release</span>
            </>
          )}
        </div>

        {/* .env is readable by Owners and Editors only (RLS), so Viewers just get told where it lives. */}
        <div className="col-span-2 flex min-w-0 md:col-span-1">
          {!editable ? (
            <span className="text-xs text-muted-foreground">.env: Editors only</span>
          ) : env.env_file_updated_at ? (
            <button
              type="button"
              onClick={() => setViewingEnv(true)}
              className="inline-flex min-w-0 items-center gap-1.5 text-xs text-foreground hover:text-primary"
              title={`Saved ${formatDateTime(env.env_file_updated_at)}`}
            >
              <FileKey size={13} strokeWidth={1.75} className="flex-none text-muted-foreground" aria-hidden />
              <span className="font-mono">.env</span>
              <span className="truncate text-muted-foreground">· {relativeTime(env.env_file_updated_at)}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus size={13} strokeWidth={1.75} aria-hidden /> Add .env
            </button>
          )}
        </div>

        <div className="col-span-2 flex items-center justify-end gap-1 md:col-span-1">
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="ghost">
            History
            <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
            </Button>
          </CollapsibleTrigger>
          {editable && (
            <>
              <Button variant="outline" size="sm" onClick={() => setReleasing(true)}>
                <Rocket size={13} strokeWidth={1.75} /> Release
              </Button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${env.name}`} title={`Actions for ${env.name}`} className="size-7">
                    <Ellipsis size={15} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onSelect={() => setEditing(true)}>
                      <Pencil size={14} strokeWidth={1.75} className="text-muted-foreground" /> Edit Environment
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                      <Trash size={14} strokeWidth={1.75} /> Delete Environment
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <CollapsibleContent className="border-t border-border/60 bg-muted/60 px-4 py-4 sm:px-5">
        <ReleaseHistory environmentId={env.id} projectId={projectId} editable={editable} />
      </CollapsibleContent>

      {releasing && (
        <ReleaseDialog
          projectId={projectId}
          environment={env}
          currentVersion={version?.version}
          onClose={() => setReleasing(false)}
        />
      )}
      {editing && (
        <EnvironmentDialog projectId={projectId} repositoryId={env.repository_id} environment={env} onClose={() => setEditing(false)} />
      )}
      {viewingEnv && (
        <EnvFileDialog
          environment={env}
          onClose={() => setViewingEnv(false)}
          onEdit={() => {
            setViewingEnv(false)
            setEditing(true)
          }}
        />
      )}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete Environment"
        confirmLabel="Delete"
        body={
          <p>
            Delete <strong className="font-medium">{env.name}</strong> with its .env and release history?
          </p>
        }
        onConfirm={() => del.mutateAsync(env.id)}
      />
    </li>
    </Collapsible>
  )
}
