import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { BlockError, LoadingReveal } from '@/components/Loading'
import { Card } from '@/components/ui/card'
import { Board } from '@/features/board/Board'
import { PageHeader } from '@/layout/PageHeader'
import { errorMessage } from '@/lib/errors'
import { canEdit } from '@/lib/types'
import { MembersSection } from './MembersSection'
import { DescriptionBlock, EditProjectDialog, ProjectHeader } from './ProjectHeader'
import {
  useEnvironmentVersions,
  useMembers,
  usePendingInvitations,
  useProject,
  useQuickLinks,
  useRepositories,
} from './queries'
import { QuickLinksSection } from './QuickLinksSection'
import { RepositoriesSection } from './RepositoriesSection'
import { sketchProject } from './sketch'

/*
 * Project detail: a dot-grain hero card for the Project (header, description, Repository, Quick Links,
 * Members), then the Board. Desktop info grid: main column + 340px rail, rows aligned to the top.
 *
 * The first load is sketched in pencil (LoadingReveal): the hero card waits for the Project and every
 * section in it, the Board for its own data. The sections fetch with the Project id from the URL, so
 * they load alongside the Project instead of after it.
 */
export function ProjectPage() {
  const { projectId = '' } = useParams()
  const { data: project, isPending, error, refetch } = useProject(projectId)
  const owner = project?.my_role === 'owner'
  const repos = useRepositories(projectId)
  const versions = useEnvironmentVersions(projectId)
  const links = useQuickLinks(projectId)
  const members = useMembers(projectId)
  const invitations = usePendingInvitations(projectId, owner)
  const infoPending =
    isPending || repos.isPending || versions.isPending || links.isPending || members.isPending || (owner && invitations.isPending)
  const [editingDescription, setEditingDescription] = useState(false)

  const frame = (name: string, children: ReactNode) => (
    <>
      <PageHeader crumbs={[{ label: 'prologue', to: '/' }, { label: 'projects', to: '/projects' }, { label: name }]} />
      {children}
    </>
  )

  if (error) {
    return frame(
      'Project',
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">
        <BlockError message={`Couldn't load this Project. ${errorMessage(error)}`} onRetry={() => refetch()} />
      </div>,
    )
  }

  if (!isPending && !project) {
    return frame(
      'Not found',
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-4 py-6 sm:px-6">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="text-sm text-muted-foreground">It may have been deleted, or you're no longer a Member.</p>
        <Link to="/projects" className="data text-sm underline decoration-border underline-offset-4 hover:decoration-foreground">
          back to projects
        </Link>
      </div>,
    )
  }

  const placeholder = sketchProject(projectId)

  return frame(
    project?.name ?? '…',
    <div className="flex flex-col gap-6 pb-16">
      <div className="mx-auto mt-6 w-full max-w-[1280px] px-4 sm:px-6">
        <LoadingReveal pending={infoPending}>
          {(sketch) => {
            const shown = sketch || !project ? placeholder : project
            const editable = canEdit(shown.my_role)
            return (
              <Card className="grain gap-8 p-5 sm:p-8">
                <ProjectHeader project={shown} />

                <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="flex min-w-0 flex-col gap-8">
                    <section aria-label="Description" className="max-w-[75ch]">
                      <DescriptionBlock project={shown} onEdit={editable ? () => setEditingDescription(true) : undefined} />
                    </section>
                    <RepositoriesSection projectId={projectId} editable={editable} />
                  </div>
                  <aside className="flex min-w-0 flex-col gap-8" aria-label="Project links and Members">
                    <QuickLinksSection projectId={projectId} editable={editable} />
                    <MembersSection project={shown} />
                  </aside>
                </div>
              </Card>
            )
          }}
        </LoadingReveal>
      </div>

      <Board project={project ?? placeholder} projectPending={isPending} />

      {editingDescription && project && <EditProjectDialog project={project} onClose={() => setEditingDescription(false)} />}
    </div>,
  )
}
