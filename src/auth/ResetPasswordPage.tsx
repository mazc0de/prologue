import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { FormError, TextField } from '@/components/Field'
import { FullScreenLoading } from '@/components/Loading'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './AuthProvider'

const MIN_PASSWORD = 8

export function ResetPasswordPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [waited, setWaited] = useState(false)

  // The recovery link's token is exchanged asynchronously; give it a moment.
  useEffect(() => {
    const t = window.setTimeout(() => setWaited(true), 1500)
    return () => window.clearTimeout(t)
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/', { replace: true })
  }

  if (!session && !waited) return <FullScreenLoading />

  if (!session) {
    return (
      <AuthLayout title="Link expired" subtitle="This reset link is invalid or has already been used.">
        <Link to="/forgot-password" className="font-medium text-foreground underline-offset-2 hover:underline">
          Request a new link
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password" subtitle={session.user.email}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={`At least ${MIN_PASSWORD} characters.`}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" loading={busy} className="mt-2 h-9">
          Save password
        </Button>
      </form>
    </AuthLayout>
  )
}
