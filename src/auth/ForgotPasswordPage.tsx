import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { FormError, TextField } from '@/components/Field'
import { normaliseEmail } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const address = normaliseEmail(email)
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSentTo(address)
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={sentTo ? undefined : "We'll email you a link to choose a new one."}
      footer={
        <Link to="/login" className="font-medium text-foreground underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sentTo ? (
        <p className="text-sm">
          If an account exists for <strong className="font-medium">{sentTo}</strong>, a reset link is on its way. Open it in
          this browser.
        </p>
      ) : (
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
          <Button type="submit" loading={busy} className="mt-2 h-9">
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
