import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { FormError } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { registerAccount } from '@/lib/auth/actions'
import { useAuth } from '@/lib/auth/context'
import { errorsByField, registerSchema } from '@/lib/validation/auth'

export function RegisterPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/dashboard" replace />

  const bind = (name: keyof typeof values) => ({
    id: name,
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: e.target.value })),
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = registerSchema.safeParse(values)
    if (!parsed.success) return setErrors(errorsByField(parsed.error))
    setErrors({})
    setError(null)
    setBusy(true)
    try {
      await registerAccount(parsed.data)
      navigate(`/verify?email=${encodeURIComponent(parsed.data.email)}`)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="We'll email you a code to activate it."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Name" htmlFor="name" error={errors.name}>
          <Input {...bind('name')} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input {...bind('email')} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint="At least 8 characters, with letters and a number."
          error={errors.password}
        >
          <PasswordInput {...bind('password')} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
          <PasswordInput {...bind('confirmPassword')} autoComplete="new-password" />
        </Field>
        <FormError error={error} />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
