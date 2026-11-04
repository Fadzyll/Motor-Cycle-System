import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FormError } from '@/components/ui/feedback'
import { signOut } from '@/lib/auth/actions'
import { cn } from '@/lib/utils'

/** Icon button that asks "Sign out?" before signing out (avoids accidental taps on phones). */
export function SignOutButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await signOut() // RequireAuth then sends the user to the login screen
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Sign out"
        title="Sign out"
        className={cn(
          'grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-bg hover:text-danger focus-visible:outline-2 focus-visible:outline-primary',
          className,
        )}
      >
        <LogOut className="h-5 w-5" aria-hidden />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Sign out?">
        <p className="text-sm text-muted">You'll need your email and password to sign in again.</p>
        <FormError error={error} />
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" disabled={busy} onClick={confirm}>
            {busy ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
