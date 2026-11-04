import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { FormError } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { EmailNotConfirmedError, signIn } from '@/lib/auth/actions'
import { useAuth } from '@/lib/auth/context'
import { errorsByField, loginSchema } from '@/lib/validation/auth'

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) return setErrors(errorsByField(parsed.error))
    setErrors({})
    setError(null)
    setBusy(true)
    try {
      await signIn(parsed.data.email, parsed.data.password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof EmailNotConfirmedError) {
        navigate(`/verify?email=${encodeURIComponent(parsed.data.email)}&resend=1`)
        return
      }
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Motorcycle System"
      subtitle="Track maintenance and find workshops nearby."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-primary underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="-mt-2 text-right">
          <Link
            to={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ''}`}
            className="text-sm text-primary underline"
          >
            Forgot password?
          </Link>
        </div>
        <FormError error={error} />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
