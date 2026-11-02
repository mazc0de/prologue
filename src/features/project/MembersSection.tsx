import { Check, Copy, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { useUserId } from '@/auth/AuthProvider'
import { Avatar } from '@/components/Avatar'
import { RolePill } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { BlockError } from '@/components/Loading'
import { usePlotPhase, useRevealKey } from '@/components/plot-reveal'
import { notify } from '@/lib/notify'
import { copyText } from '@/lib/clipboard'
import { errorMessage } from '@/lib/errors'
import { relativeTime } from '@/lib/format'
import { type ProjectCard, type ProjectRole } from '@/lib/types'
import { InviteDialog } from './InviteDialog'
import {
  registrationMessage,
  useChangeRole,
  useMembers,
  usePendingInvitations,
  useRemoveMember,
  useRevokeInvitation,
  type MemberRow,
} from './queries'
import { SectionHeader } from './SectionHeader'
import { SKETCH_MEMBERS } from './sketch'

export function MembersSection({ project }: { project: ProjectCard }) {
  const owner = project.my_role === 'owner'
  const members = useMembers(project.id)
  const pending = usePendingInvitations(project.id, owner)
  const [inviting, setInviting] = useState(false)
  // While the Project page is sketched, draw placeholder Members; ProjectPage holds the reveal until these load.
  const sketch = usePlotPhase() === 'sketch'
  const revealKey = useRevealKey()
  const rows = sketch ? SKETCH_MEMBERS : members.data

  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-3">
      <SectionHeader
        id="members-heading"
        title="Members"
        count={rows?.length}
        action={
          owner && (
            <Button size="sm" variant="ghost" onClick={() => setInviting(true)}>
              <UserPlus size={14} strokeWidth={1.75} /> Invite
            </Button>
          )
        }
      />

      {members.error && !sketch ? (
        <BlockError message={`Couldn't load Members. ${errorMessage(members.error)}`} onRetry={() => members.refetch()} />
      ) : (
        rows && (
          <ul className="flex flex-col rounded-md border bg-card">
            {rows.map((m, i) => (
              <MemberItem key={revealKey(m.user_id, i)} member={m} project={project} first={i === 0} />
            ))}
          </ul>
        )
      )}

      {owner && pending.data && pending.data.length > 0 && (
        <div className="flex flex-col gap-2 pt-2">
          <h3 className="text-sm font-medium">
            Pending Invitations <span className="tabular font-normal text-muted-foreground">{pending.data.length}</span>
          </h3>
          <ul className="flex flex-col rounded-md border border-dashed bg-card">
            {pending.data.map((inv, i) => (
              <PendingItem key={inv.id} invitation={inv} project={project} first={i === 0} />
            ))}
          </ul>
        </div>
      )}

      {inviting && <InviteDialog project={project} onClose={() => setInviting(false)} />}
    </section>
  )
}

function MemberItem({ member, project, first }: { member: MemberRow; project: ProjectCard; first: boolean }) {
  const userId = useUserId()
  const changeRole = useChangeRole(project.id)
  const remove = useRemoveMember(project.id)
  const [removing, setRemoving] = useState(false)
  const name = member.profile?.display_name ?? 'Unknown'
  const isSelf = member.user_id === userId
  const ownerView = project.my_role === 'owner'
  const manageable = ownerView && member.role !== 'owner'

  return (
    <li className={first ? undefined : 'border-t border-border/60'}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Avatar userId={member.user_id} name={name} size={28} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">
            {name}
            {isSelf && <span className="font-normal text-muted-foreground"> (you)</span>}
          </span>
          <span className="truncate text-xs text-muted-foreground">{member.profile?.email}</span>
        </div>
        {manageable ? (
          <>
            <Select
              value={member.role}
              disabled={changeRole.isPending}
              onValueChange={(role) =>
                changeRole.mutate(
                  { userId: member.user_id, role: role as Exclude<ProjectRole, 'owner'> },
                  { onError: notify.error },
                )
              }
            >
              <SelectTrigger size="sm" aria-label={`Role for ${name}`} className="h-7 flex-none text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon-sm" aria-label={`Remove ${name}`} title={`Remove ${name}`} className="size-7" onClick={() => setRemoving(true)}>
              <X size={14} />
            </Button>
          </>
        ) : (
          <RolePill role={member.role} />
        )}
      </div>
      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        title="Remove Member"
        confirmLabel="Remove"
        body={
          <p>
            Remove <strong className="font-medium">{name}</strong> from {project.name}? Their Tasks become unassigned.
          </p>
        }
        onConfirm={() => remove.mutateAsync(member.user_id)}
      />
    </li>
  )
}

interface PendingInvitation {
  id: string
  email: string
  role: ProjectRole
  created_at: string
  is_registered: boolean
  invitee_name: string | null
}

function PendingItem({ invitation, project, first }: { invitation: PendingInvitation; project: ProjectCard; first: boolean }) {
  const revoke = useRevokeInvitation(project.id)
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (await copyText(registrationMessage(project.name, invitation.email))) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <li className={first ? undefined : 'border-t border-border/60'}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">{invitation.invitee_name ?? invitation.email}</span>
          <span className="truncate text-xs text-muted-foreground">
            {invitation.invitee_name ? `${invitation.email} · ` : ''}
            {invitation.is_registered ? 'Waiting for them to accept' : 'Not registered yet'} · {invitation.role} ·{' '}
            {relativeTime(invitation.created_at)}
          </span>
        </div>
        {!invitation.is_registered && (
          <Button size="sm" variant="ghost" onClick={copy} title="Copy a registration message to send them">
            {copied ? <Check size={13} /> : <Copy size={13} strokeWidth={1.75} />}
            {copied ? 'Copied' : 'Copy message'}
          </Button>
        )}
        <Button variant="ghost" size="icon-sm"
          aria-label={`Revoke Invitation for ${invitation.email}`} title={`Revoke Invitation for ${invitation.email}`}
          className="size-7"
          onClick={() => revoke.mutate(invitation.id, { onError: notify.error })}
        >
          <X size={14} />
        </Button>
      </div>
    </li>
  )
}
