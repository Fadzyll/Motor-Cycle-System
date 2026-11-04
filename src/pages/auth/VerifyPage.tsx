import { MailCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { CodeInput } from '@/components/auth/CodeInput'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { FormError } from '@/components/ui/feedback'
import { resendSignupCode, verifySignupCode } from '@/lib/auth/actions'
import { useCooldown } from '@/lib/auth/useCooldown'
import { codeField } from '@/lib/validation/auth'

const RESEND_WAIT_S = 60

/** "Activate your account": enter the code emailed after registering. */
export function VerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const email = params.get('email') ?? ''
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [error, setError] = useState<unknown>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, startCooldown] = useCooldown()
  const autoResent = useRef(false)

  async function resend() {
    setError(null)
    try {
      await resendSignupCode(email)
      setNotice('We sent you a new code.')
      startCooldown(RESEND_WAIT_S)
    } catch (err) {
      setError(err)
    }
  }

  // Coming from "Sign in" with an account that was never activated: send a fresh code once.
  useEffect(() => {
    if (params.get('resend') === '1' && email && !autoResent.current) {
      autoResent.current = true
      void resend()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!email) {
    return (
      <AuthLayout title="Activate account">
        <p className="text-sm text-muted">
          Missing email address.{' '}
          <Link to="/register" className="text-primary underline">
            Create an account
          </Link>{' '}
          or{' '}
          <Link to="/login" className="text-primary underline">
            sign in
          </Link>
          .
        </p>
      </AuthLayout>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = codeField.safeParse(code)
    if (!parsed.success) return setFieldError(parsed.error.issues[0].message)
    setFieldError(undefined)
    setError(null)
    setBusy(true)
    try {
      await verifySignupCode(email, parsed.data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Activate your account"
      subtitle={
        <>
          We sent a code to <strong className="text-fg">{email}</strong>. Check your inbox (and spam folder).
        </>
      }
      footer={
        <Link to="/login" className="text-primary underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Activation code" htmlFor="code" error={fieldError}>
          <CodeInput value={code} onChange={setCode} />
        </Field>
        {notice && (
          <p className="flex items-center gap-2 text-sm text-ok" role="status">
            <MailCheck className="h-4 w-4" aria-hidden /> {notice}
          </p>
        )}
        <FormError error={error} />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Activating…' : 'Activate account'}
        </Button>
        <Button type="button" variant="ghost" className="w-full" disabled={cooldown > 0} onClick={resend}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get it? Resend code"}
        </Button>
      </form>
    </AuthLayout>
  )
}
