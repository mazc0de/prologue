import { Check, Copy } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/FormDialog'
import { FormError, SelectField, TextField } from '@/components/Field'
import { copyText } from '@/lib/clipboard'
import { errorMessage } from '@/lib/errors'
import { notify } from '@/lib/notify'
import { normaliseEmail } from '@/lib/format'
import type { ProjectCard, ProjectRole } from '@/lib/types'
import { checkInvitee, registrationMessage, useInvite } from './queries'

type InviteRole = Exclude<ProjectRole, 'owner'>

type Step =
  | { kind: 'enter' }
  | { kind: 'confirm'; email: string; displayName: string | null; isRegistered: boolean }
  | { kind: 'sent-registered'; email: string; displayName: string }
  | { kind: 'sent-unregistered'; email: string }

/*
 * 1. Owner types an email → check_invitee.
 * 2. Registered: show their display name to confirm the right person (ADR 0001).
 *    Not registered: say so; the Invitation still waits for them.
 *    Already a Member / already pending: blocked.
 * 3. Insert the Invitation; for unregistered emails, offer a copyable message.
 */
export function InviteDialog({ project, onClose }: { project: ProjectCard; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('editor')
  const [step, setStep] = useState<Step>({ kind: 'enter' })
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const invite = useInvite(project.id)

  async function onCheck(e: FormEvent) {
    e.preventDefault()
    const address = normaliseEmail(email)
    setError(null)
    setChecking(true)
    try {
      const result = await checkInvitee(project.id, address)
      if (result.isMember) {
        setError(`${result.displayName ?? address} is already a Member of this Project.`)
      } else if (result.hasPendingInvitation) {
        setError(`${address} already has a pending Invitation. Revoke it first to change the role.`)
      } else {
        setStep({ kind: 'confirm', email: address, displayName: result.displayName, isRegistered: result.isRegistered })
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setChecking(false)
    }
  }

  function onSend() {
    if (step.kind !== 'confirm') return
    setError(null)
    invite.mutate(
      { email: step.email, role },
      {
        onSuccess: () => {
          notify.success(`Invitation sent to ${step.email}`)
          setStep(
            step.isRegistered && step.displayName
              ? { kind: 'sent-registered', email: step.email, displayName: step.displayName }
              : { kind: 'sent-unregistered', email: step.email },
          )
        },
        onError: (err) => setError(errorMessage(err)),
      },
    )
  }

  async function onCopy(address: string) {
    if (await copyText(registrationMessage(project.name, address))) {
      notify.success('Invitation message copied')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } else {
      notify.error(new Error("Couldn't copy the message."))
    }
  }

  const footer =
    step.kind === 'enter' ? (
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" form="invite-form" loading={checking}>
          Continue
        </Button>
      </>
    ) : step.kind === 'confirm' ? (
      <>
        <Button variant="ghost" onClick={() => setStep({ kind: 'enter' })}>
          Back
        </Button>
        <Button onClick={onSend} loading={invite.isPending}>
          Send Invitation
        </Button>
      </>
    ) : (
      <Button onClick={onClose}>
        Done
      </Button>
    )

  return (
    <FormDialog open onClose={onClose} title={`Invite to ${project.name}`} footer={footer}>
      <div className="flex flex-col gap-4">
        <FormError message={error} />

        {step.kind === 'enter' && (
          <form id="invite-form" onSubmit={onCheck} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
            <TextField
              label="Email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
            />
            <SelectField<InviteRole>
              label="Role"
              value={role}
              onValueChange={setRole}
              options={[
                { value: 'editor', label: 'Editor' },
                { value: 'viewer', label: 'Viewer' },
              ]}
            />
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Editors change everything except Members and deletion. Viewers can only read.
            </p>
          </form>
        )}

        {step.kind === 'confirm' &&
          (step.isRegistered && step.displayName ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">This email belongs to:</p>
              <div className="flex items-center gap-3 rounded-md border bg-background px-4 py-3">
                <Avatar userId={step.email} name={step.displayName} size={32} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{step.displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{step.email}</span>
                </div>
                <span className="ml-auto text-xs text-muted-foreground capitalize">as {role}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Make sure this is the person you mean. Prologue doesn’t verify email addresses, so a name you don’t
                recognise could be someone else.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                <strong className="font-medium">{step.email}</strong> isn’t registered on Prologue yet.
              </p>
              <p className="text-sm text-muted-foreground">
                The Invitation waits for them as {role}. After sending, you’ll get a message to pass on so they can
                register with this email.
              </p>
            </div>
          ))}

        {step.kind === 'sent-registered' && (
          <p className="text-sm">
            Invitation sent. <strong className="font-medium">{step.displayName}</strong> sees it in their notifications
            and can accept it there.
          </p>
        )}

        {step.kind === 'sent-unregistered' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">Invitation saved. Send them this message so they can register:</p>
            <div className="rounded-md border bg-background px-4 py-3 text-sm break-words">
              {registrationMessage(project.name, step.email)}
            </div>
            <Button variant="outline" className="self-start" onClick={() => onCopy(step.email)}>
              {copied ? <Check size={14} /> : <Copy size={14} strokeWidth={1.75} />}
              {copied ? 'Copied' : 'Copy message'}
            </Button>
          </div>
        )}
      </div>
    </FormDialog>
  )
}
