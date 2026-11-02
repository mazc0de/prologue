import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Bar, BlockError } from '@/components/Loading'
import { Card } from '@/components/ui/card'
import { Board } from '@/features/board/Board'
import { PageHeader } from '@/layout/PageHeader'
import { errorMessage } from '@/lib/errors'
import { canEdit } from '@/lib/types'
import { MembersSection } from './MembersSection'
import { DescriptionBlock, EditProjectDialog, ProjectHeader } from './ProjectHeader'
import { useProject } from './queries'
import { QuickLinksSection } from './QuickLinksSection'
import { RepositoriesSection } from './RepositoriesSection'

/*
 * Project detail: a dot-grain hero card for the Project (header, description, Repository, Quick Links,
 * Members), then the Board. Desktop info grid: main column + 340px rail, rows aligned to the top.
 */
export function ProjectPage() {
  const { projectId = '' } = useParams()
  const { data: project, isPending, error, refetch } = useProject(projectId)
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

  if (isPending) {
    return frame(
      '…',
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-6 sm:px-6" aria-busy="true">
        <Bar className="h-7 w-64" />
        <Bar className="h-4 w-40" />
      </div>,
    )
  }

  if (!project) {
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

  const editable = canEdit(project.my_role)

  return frame(
    project.name,
    <div className="flex flex-col gap-6 pb-16">
      <div className="mx-auto mt-6 w-full max-w-[1280px] px-4 sm:px-6">
        <Card className="grain gap-8 p-5 sm:p-8">
          <ProjectHeader project={project} />

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-8">
              <section aria-label="Description" className="max-w-[75ch]">
                <DescriptionBlock project={project} onEdit={editable ? () => setEditingDescription(true) : undefined} />
              </section>
              <RepositoriesSection projectId={project.id} editable={editable} />
            </div>
            <aside className="flex min-w-0 flex-col gap-8" aria-label="Project links and Members">
              <QuickLinksSection projectId={project.id} editable={editable} />
              <MembersSection project={project} />
            </aside>
          </div>
        </Card>
      </div>

      <Board project={project} />

      {editingDescription && <EditProjectDialog project={project} onClose={() => setEditingDescription(false)} />}
    </div>,
  )
}
