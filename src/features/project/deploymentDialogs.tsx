import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { KindPill } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/FormDialog'
import { FormError, SelectField, TextAreaField, TextField } from '@/components/Field'
import { maskEnv } from '@/lib/env'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'
import { isHttpUrl } from '@/lib/format'
import { ENVIRONMENT_KINDS, type EnvironmentKind, type Repository } from '@/lib/types'
import { useSaveEnvironment, useSaveRepository, type EnvironmentSummary, useEnvFile } from './queries'
import { notify } from '@/lib/notify'

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
      {
        onSuccess: () => {
          notify.success(repository ? 'Repository saved' : 'Repository added')
          onClose()
        },
      },
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

export function EnvironmentDialog({
  projectId,
  repositoryId,
  environment,
  onClose,
}: {
  projectId: string
  repositoryId: string
  environment?: EnvironmentSummary
  onClose: () => void
}) {
  const [name, setName] = useState(environment?.name ?? '')
  const [kind, setKind] = useState<EnvironmentKind>(environment?.kind ?? 'staging')
  const [branch, setBranch] = useState(environment?.branch ?? '')
  // Only fetch the .env when there is one. null = untouched, so saving leaves it as it is.
  const envFile = useEnvFile(environment?.env_file_updated_at ? environment.id : undefined)
  const [envDraft, setEnvDraft] = useState<string | null>(null)
  // An existing .env opens with its values hidden; a new one starts shown so it can be typed in.
  const [envShown, setEnvShown] = useState(!environment?.env_file_updated_at)
  const envText = envDraft ?? envFile.data ?? ''
  const envLoading = envFile.isLoading
  const envFailed = !!envFile.error
  const save = useSaveEnvironment(projectId)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate(
      {
        id: environment?.id,
        repository_id: repositoryId,
        name: name.trim(),
        kind,
        branch: branch.trim(),
        envFile: envDraft ?? undefined,
      },
      {
        onSuccess: () => {
          notify.success(environment ? 'Environment saved' : 'Environment added')
          onClose()
        },
      },
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
          <Button type="submit" form="env-form" loading={save.isPending} disabled={envLoading}>
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
        <div className="relative">
          <TextAreaField
            label=".env"
            hint={
              envShown
                ? 'Only Owners and Editors can see this. Leave it empty for no .env.'
                : 'Values are hidden. Show them to edit.'
            }
            error={envFailed ? `Couldn't load the .env. ${errorMessage(envFile.error)}` : null}
            placeholder={envLoading ? 'Loading .env…' : 'API_URL=https://api.example.com\nAPP_KEY=…'}
            disabled={envLoading || envFailed}
            readOnly={!envShown}
            maxLength={65536}
            rows={10}
            spellCheck={false}
            autoComplete="off"
            wrap="off"
            value={envShown ? envText : maskEnv(envText)}
            onChange={(e) => setEnvDraft(e.target.value)}
            className={cn('font-mono text-xs', !envShown && 'text-muted-foreground')}
          />
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="absolute top-0 right-0 -mt-1"
            aria-pressed={envShown}
            disabled={envLoading || envFailed}
            onClick={() => setEnvShown((v) => !v)}
          >
            {envShown ? <EyeOff /> : <Eye />} {envShown ? 'Hide values' : 'Show values'}
          </Button>
        </div>
      </form>
    </FormDialog>
  )
}
