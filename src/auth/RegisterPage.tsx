import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { FormError, TextField } from '@/components/Field'
import { normaliseEmail } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'

const MIN_PASSWORD = 8

export function RegisterPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const invitedEmail = params.get('email') ?? ''
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState(invitedEmail)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touchedConfirm, setTouchedConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const mismatch = touchedConfirm && confirm.length > 0 && confirm !== password

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouchedConfirm(true)
    if (password !== confirm) return
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({
      email: normaliseEmail(email),
      password,
      options: { data: { display_name: displayName.trim() } },
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    // Email confirmation is off (ADR 0001), so signUp returns a session.
    if (data.session) navigate('/', { replace: true })
    else setError('Account created, but no session was returned. Try signing in.')
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle={invitedEmail ? 'Your Invitation will be waiting once you sign up.' : 'Keep every project you build in one log.'}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-foreground underline-offset-2 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField
          label="Display name"
          autoComplete="name"
          required
          maxLength={80}
          autoFocus
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          hint="Shown to people you share Projects with."
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={`At least ${MIN_PASSWORD} characters.`}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setTouchedConfirm(true)}
          error={mismatch ? 'Passwords do not match.' : null}
        />
        <Button type="submit" loading={busy} className="mt-2 h-9">
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
