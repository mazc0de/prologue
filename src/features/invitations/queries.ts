import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { unwrap } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'

export function useMyInvitations(userId: string) {
  const queryClient = useQueryClient()

  // Any change on invitations visible to me → refetch the bell.
  useEffect(() => {
    const channel = supabase
      .channel(`my-invitations:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.myInvitations })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  return useQuery({
    queryKey: queryKeys.myInvitations,
    queryFn: async () => unwrap(await supabase.rpc('my_pending_invitations')),
    refetchInterval: 60_000,
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) =>
      unwrap(await supabase.rpc('accept_invitation', { p_invitation_id: invitationId })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myInvitations })
      queryClient.invalidateQueries({ queryKey: queryKeys.projectCards })
    },
  })
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) => {
      unwrap(await supabase.rpc('decline_invitation', { p_invitation_id: invitationId }))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myInvitations }),
  })
}
