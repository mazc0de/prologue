import { Check, Copy, Eye, EyeOff, Pencil } from 'lucide-react'
import { useState } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { BlockError } from '@/components/Loading'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/clipboard'
import { maskEnv } from '@/lib/env'
import { errorMessage } from '@/lib/errors'
import { useEnvFile } from './queries'

/** Read-only view of one Environment's .env: values hidden until asked, copied as is. */
export function EnvFileDialog({
  environment,
  onEdit,
  onClose,
}: {
  environment: { id: string; name: string }
  onEdit: () => void
  onClose: () => void
}) {
  const envFile = useEnvFile(environment.id)
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  const content = envFile.data

  async function onCopy() {
    if (content && (await copyText(content))) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      size="lg"
      title={`${environment.name} .env`}
      description="Only Owners and Editors can see this."
      footer={
        <>
          <Button variant="ghost" className="sm:mr-auto" onClick={onEdit}>
            <Pencil size={14} strokeWidth={1.75} /> Edit
          </Button>
          <Button variant="outline" disabled={!content} onClick={() => setShown((v) => !v)}>
            {shown ? <EyeOff size={14} /> : <Eye size={14} />} {shown ? 'Hide values' : 'Show values'}
          </Button>
          <Button disabled={!content} onClick={onCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy .env'}
          </Button>
        </>
      }
    >
      {envFile.error ? (
        <BlockError message={`Couldn't load the .env. ${errorMessage(envFile.error)}`} onRetry={() => envFile.refetch()} />
      ) : envFile.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading .env…</p>
      ) : !content ? (
        <p className="text-sm text-muted-foreground">This Environment has no .env yet.</p>
      ) : (
        <pre className="overflow-x-auto rounded-md border bg-muted/60 p-3 font-mono text-xs leading-5">
          {shown ? content : maskEnv(content)}
        </pre>
      )}
    </FormDialog>
  )
}
