import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { FormError, PasswordField, TextField } from '@/components/Field'
import { normaliseEmail } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: normaliseEmail(email), password })
    setBusy(false)
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Pick up where you left off."
      footer={
        <>
          New to Prologue?{' '}
          <Link to="/register" className="font-medium text-foreground underline-offset-2 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            label="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Link to="/forgot-password" className="self-end text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={busy} className="mt-2 h-9">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
