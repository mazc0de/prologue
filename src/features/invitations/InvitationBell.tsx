import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useUserId } from '@/auth/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { relativeTime } from '@/lib/format'
import { notify } from '@/lib/notify'
import { useAcceptInvitation, useDeclineInvitation, useMyInvitations } from './queries'

/** Header bell: pending Invitations in a shadcn Popover, accept or decline in place. */
export function InvitationBell() {
  const userId = useUserId()
  const { data: invitations = [] } = useMyInvitations(userId)
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const count = invitations.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground"
          aria-label={count ? `Invitations, ${count} pending` : 'Invitations'}
        >
          <Bell strokeWidth={1.75} />
          {count > 0 && (
            <Badge className="data absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none">
              {count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-baseline justify-between px-4 pt-3 pb-2">
          <span className="text-sm font-semibold">Invitations</span>
          {count > 0 && <span className="text-xs text-muted-foreground">{count} pending</span>}
        </div>
        <Separator />
        {count === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            No pending Invitations. When someone invites you to a Project, it shows up here.
          </p>
        ) : (
          <ul className="flex max-h-[360px] flex-col overflow-y-auto p-1">
            {invitations.map((inv) => {
              const busy =
                (accept.isPending && accept.variables === inv.id) || (decline.isPending && decline.variables === inv.id)
              return (
                <li key={inv.id} className="flex flex-col gap-2 rounded-md px-3 py-2.5 hover:bg-muted">
                  <div className="flex flex-col">
                    <span className="truncate text-sm font-medium">{inv.project_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {inv.invited_by_name} invited you as {inv.role} · {relativeTime(inv.created_at)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        accept.mutate(inv.id, {
                          onSuccess: (projectId) => {
                            notify.success(`You joined ${inv.project_name}`)
                            setOpen(false)
                            navigate(`/projects/${projectId}`)
                          },
                          onError: notify.error,
                        })
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        decline.mutate(inv.id, { onSuccess: () => notify.success('Invitation declined'), onError: notify.error })
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
