import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { CodeInput } from '@/components/auth/CodeInput'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { FormError } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { resetPassword, sendPasswordResetCode } from '@/lib/auth/actions'
import { useCooldown } from '@/lib/auth/useCooldown'
import { emailField, errorsByField, resetSchema } from '@/lib/validation/auth'

/** Forgot password: email → code → new password. Also how code-only accounts set a first password. */
export function ForgotPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [values, setValues] = useState({ code: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, startCooldown] = useCooldown()

  async function sendCode(e?: FormEvent) {
    e?.preventDefault()
    const parsed = emailField.safeParse(email)
    if (!parsed.success) return setErrors({ email: parsed.error.issues[0].message })
    setErrors({})
    setError(null)
    setBusy(true)
    try {
      await sendPasswordResetCode(parsed.data)
      setEmail(parsed.data)
      setStep('reset')
      startCooldown(60)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault()
    const parsed = resetSchema.safeParse(values)
    if (!parsed.success) return setErrors(errorsByField(parsed.error))
    setErrors({})
    setError(null)
    setBusy(true)
    try {
      await resetPassword(email, parsed.data.code, parsed.data.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={step === 'email' ? 'Forgot password' : 'Set a new password'}
      subtitle={
        step === 'email' ? (
          "Enter your email and we'll send you a code."
        ) : (
          <>
            If <strong className="text-fg">{email}</strong> has an account, we sent it a code.
          </>
        )
      }
      footer={
        <Link to="/login" className="text-primary underline">
          Back to sign in
        </Link>
      }
    >
      {step === 'email' ? (
        <form onSubmit={sendCode} noValidate className="space-y-4">
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <FormError error={error} />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={onReset} noValidate className="space-y-4">
          <Field label="Code" htmlFor="code" error={errors.code}>
            <CodeInput value={values.code} onChange={(code) => setValues((v) => ({ ...v, code }))} />
          </Field>
          <Field
            label="New password"
            htmlFor="password"
            hint="At least 8 characters, with letters and a number."
            error={errors.password}
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword}>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={(e) => setValues((v) => ({ ...v, confirmPassword: e.target.value }))}
            />
          </Field>
          <FormError error={error} />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save password and sign in'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={cooldown > 0 || busy}
            onClick={() => sendCode()}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
