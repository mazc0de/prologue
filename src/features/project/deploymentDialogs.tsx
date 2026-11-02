import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { KindPill } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/FormDialog'
import { FormError, SelectField, TextField } from '@/components/Field'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'
import { isHttpUrl } from '@/lib/format'
import { ENVIRONMENT_KINDS, type EnvironmentKind, type Repository } from '@/lib/types'
import { useSaveEnvironment, useSaveRepository, type EnvironmentWithUrls } from './queries'

export function RepositoryDialog({
  projectId,
  repository,
  onClose,
}: {
  projectId: string
  repository?: Repository
  onClose: () => void
}) {
  const [name, setName] = useState(repository?.name ?? '')
  const [url, setUrl] = useState(repository?.url ?? '')
  const [productionBranch, setProductionBranch] = useState('')
  const [developmentBranch, setDevelopmentBranch] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const save = useSaveRepository(projectId)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isHttpUrl(url)) {
      setUrlError('Use a full URL starting with https://')
      return
    }
    save.mutate(
      repository
        ? { id: repository.id, name: name.trim(), url: url.trim() }
        : {
            name: name.trim(),
            url: url.trim(),
            productionBranch: productionBranch.trim(),
            developmentBranch: developmentBranch.trim(),
          },
      { onSuccess: onClose },
    )
  }

  function onUrlChange(value: string) {
    setUrl(value)
    setUrlError(null)
    // Suggest a name from the URL's last path segment.
    if (!repository && !name) {
      const match = value.match(/\/([^/]+?)(?:\.git)?\/?$/)
      if (match && isHttpUrl(value)) setName(match[1])
    }
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title={repository ? 'Edit Repository' : 'Add Repository'}
      description={
        repository
          ? undefined
          : 'A Project has one Repository. Its Production and Development Environments use the branches you enter here.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="repo-form" loading={save.isPending}>
            {repository ? 'Save' : 'Add Repository'}
          </Button>
        </>
      }
    >
      <form id="repo-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={save.error ? errorMessage(save.error) : null} />
        <TextField
          label="URL"
          type="url"
          required
          autoFocus
          placeholder="https://github.com/you/project"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          error={urlError}
          hint="GitHub, GitLab and Bitbucket are recognised automatically."
        />
        <TextField label="Name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        {!repository && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Production branch"
              required
              maxLength={255}
              placeholder="e.g. main"
              value={productionBranch}
              onChange={(e) => setProductionBranch(e.target.value)}
              className="font-mono"
              hint="Creates the Production Environment."
            />
            <TextField
              label="Development branch"
              maxLength={255}
              placeholder="e.g. develop"
              value={developmentBranch}
              onChange={(e) => setDevelopmentBranch(e.target.value)}
              className="font-mono"
              hint="Optional. Leave empty to skip."
            />
          </div>
        )}
      </form>
    </FormDialog>
  )
}

interface UrlDraft {
  key: string
  id?: string
  label: string
  url: string
}

let draftKey = 0
const newDraft = (): UrlDraft => ({ key: `new-${draftKey++}`, label: '', url: '' })

export function EnvironmentDialog({
  projectId,
  repositoryId,
  environment,
  onClose,
}: {
  projectId: string
  repositoryId: string
  environment?: EnvironmentWithUrls
  onClose: () => void
}) {
  const [name, setName] = useState(environment?.name ?? '')
  const [kind, setKind] = useState<EnvironmentKind>(environment?.kind ?? 'staging')
  const [branch, setBranch] = useState(environment?.branch ?? '')
  const [urls, setUrls] = useState<UrlDraft[]>(
    environment?.environment_urls.map((u) => ({ key: u.id, id: u.id, label: u.label ?? '', url: u.url })) ?? [],
  )
  const [urlErrors, setUrlErrors] = useState<Set<string>>(new Set())
  const save = useSaveEnvironment(projectId)

  function update(key: string, patch: Partial<UrlDraft>) {
    setUrls((all) => all.map((u) => (u.key === key ? { ...u, ...patch } : u)))
    setUrlErrors((errs) => {
      const next = new Set(errs)
      next.delete(key)
      return next
    })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const kept = urls.filter((u) => u.url.trim() || u.label.trim())
    const bad = new Set(kept.filter((u) => !isHttpUrl(u.url)).map((u) => u.key))
    if (bad.size) {
      setUrlErrors(bad)
      return
    }
    save.mutate(
      {
        id: environment?.id,
        repository_id: repositoryId,
        name: name.trim(),
        kind,
        branch: branch.trim(),
        urls: kept.map((u) => ({ id: u.id, label: u.label, url: u.url })),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title={environment ? 'Edit Environment' : 'Add Environment'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="env-form" loading={save.isPending}>
            {environment ? 'Save' : 'Add Environment'}
          </Button>
        </>
      }
    >
      <form id="env-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={save.error ? errorMessage(save.error) : null} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Name"
            required
            maxLength={60}
            autoFocus
            placeholder="Staging"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <SelectField<EnvironmentKind>
            label="Kind"
            value={kind}
            onValueChange={setKind}
            hint="The Production Version is shown on the dashboard."
            options={ENVIRONMENT_KINDS.map((k) => ({ value: k, label: <KindPill kind={k} /> }))}
          />
        </div>
        <TextField
          label="Branch"
          required
          maxLength={255}
          placeholder="release/staging"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="font-mono"
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">URLs</legend>
          {urls.length === 0 && <p className="text-xs text-muted-foreground">No URLs yet. Add the app, the admin, the API…</p>}
          {urls.map((u, i) => (
            <div key={u.key} className="flex flex-col gap-1">
              <div className="grid grid-cols-[120px_minmax(0,1fr)_auto] gap-2">
                <Input
                  aria-label={`URL ${i + 1} label`}
                  placeholder="Label"
                  maxLength={60}
                  value={u.label}
                  onChange={(e) => update(u.key, { label: e.target.value })}
                  
                />
                <Input
                  aria-label={`URL ${i + 1}`}
                  aria-invalid={urlErrors.has(u.key) || undefined}
                  placeholder="https://"
                  type="url"
                  value={u.url}
                  onChange={(e) => update(u.key, { url: e.target.value })}
                  className={cn(urlErrors.has(u.key) && 'border-destructive')}
                />
                <Button variant="ghost" size="icon-sm" aria-label={`Remove URL ${i + 1}`} title={`Remove URL ${i + 1}`} onClick={() => setUrls((all) => all.filter((x) => x.key !== u.key))}>
                  <X size={15} />
                </Button>
              </div>
              {urlErrors.has(u.key) && (
                <p className="text-xs text-destructive">Use a full URL starting with https://</p>
              )}
            </div>
          ))}
          <Button size="sm" variant="ghost" className="self-start" onClick={() => setUrls((all) => [...all, newDraft()])}>
            <Plus size={14} strokeWidth={2} /> Add URL
          </Button>
        </fieldset>
        <p className="text-xs text-muted-foreground">
          Never paste env variables or credentials here. Link to where they live instead.
        </p>
      </form>
    </FormDialog>
  )
}
