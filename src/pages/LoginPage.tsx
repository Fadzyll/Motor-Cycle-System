import { Bike } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendEmailCode, verifyEmailCode } from '@/lib/auth/actions'
import { useAuth } from '@/lib/auth/context'

const emailSchema = z.email('Enter a valid email address')
// Supabase sends 6–10 digit codes depending on the project's "Email OTP Length" setting.
const codeSchema = z.string().regex(/^\d{6,10}$/, 'Enter the full code from the email')

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to={from} replace />

  async function onSendCode(e: FormEvent) {
    e.preventDefault()
    const parsed = emailSchema.safeParse(email.trim())
    if (!parsed.success) return setError(parsed.error.issues[0].message)
    setBusy(true)
    setError(null)
    try {
      await sendEmailCode(parsed.data)
      setEmail(parsed.data)
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code')
    } finally {
      setBusy(false)
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault()
    const parsed = codeSchema.safeParse(code.trim())
    if (!parsed.success) return setError(parsed.error.issues[0].message)
    setBusy(true)
    setError(null)
    try {
      await verifyEmailCode(email, parsed.data)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wrong or expired code')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="safe-top grid min-h-full place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-fg">
            <Bike className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold">Motorcycle System</h1>
          <p className="mt-1 text-sm text-muted">Track maintenance and find workshops nearby.</p>
        </div>

        <Card className="p-5">
          {step === 'email' ? (
            <form onSubmit={onSendCode} noValidate>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" size="lg" className="mt-4 w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send sign-in code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={onVerify} noValidate>
              <p className="mb-4 text-sm">
                We sent a sign-in code to <strong>{email}</strong>.
              </p>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                placeholder="Code from email"
                className="text-center text-xl tracking-[0.3em] placeholder:tracking-normal"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <Button type="submit" size="lg" className="mt-4 w-full" disabled={busy}>
                {busy ? 'Checking…' : 'Sign in'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError(null)
                }}
              >
                Use a different email
              </Button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
