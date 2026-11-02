import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/FormDialog'
import { FormError, TextField } from '@/components/Field'
import { errorMessage, expectRows } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

export function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, userId } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState(profile?.display_name ?? '')
  const save = useMutation({
    mutationFn: async (display_name: string) =>
      expectRows(await supabase.from('profiles').update({ display_name }).eq('id', userId!).select('id')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      onClose()
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate(name.trim())
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Account"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="account-form" loading={save.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form id="account-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={save.error ? errorMessage(save.error) : null} />
        <TextField
          label="Display name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="Shown to Members of your Projects."
        />
        <TextField label="Email" value={profile?.email ?? ''} disabled readOnly />
      </form>
    </FormDialog>
  )
}
