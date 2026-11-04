import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ThemeSelector } from '@/components/theme/ThemeSelector'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { API_BASE_URL, apiFetch } from '@/lib/api'
import { signOut } from '@/lib/auth/actions'
import { useAuth } from '@/lib/auth/context'
import { platform } from '@/native/platform'

type Health = { ok: boolean; time: string }

export function SettingsPage() {
  const { user } = useAuth()
  const [health, setHealth] = useState<string | null>(null)

  async function checkApi() {
    setHealth('Checking…')
    try {
      const res = await apiFetch<Health>('/api/health')
      setHealth(res.ok ? `Connected (${new Date(res.time).toLocaleTimeString()})` : 'Unexpected reply')
    } catch (err) {
      setHealth(`Failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" />

      <Card className="mb-4">
        <h2 className="font-semibold">Account</h2>
        <p className="mt-1 text-sm text-muted">{user?.email}</p>
        <Button variant="outline" className="mt-4" onClick={() => signOut()}>
          Sign out
        </Button>
      </Card>

      <Card className="mb-4">
        <h2 className="font-semibold">Appearance</h2>
        <p className="mt-1 mb-3 text-sm text-muted">"System" follows your phone's light/dark setting.</p>
        <ThemeSelector />
      </Card>

      <Card>
        <h2 className="font-semibold">Diagnostics</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Platform</dt>
          <dd>{platform}</dd>
          <dt className="text-muted">API</dt>
          <dd className="break-all">{API_BASE_URL || 'same origin'}</dd>
        </dl>
        <Button variant="outline" className="mt-4" onClick={checkApi}>
          Test API connection
        </Button>
        {health && <p className="mt-2 text-sm">{health}</p>}
      </Card>
    </div>
  )
}
