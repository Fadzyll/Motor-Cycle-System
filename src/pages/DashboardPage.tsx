import { Bike, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth/context'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Signed in as ${user?.email ?? ''}`} />

      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <Bike className="h-10 w-10 text-muted" aria-hidden />
        <div>
          <p className="font-medium">No motorcycles yet</p>
          <p className="text-sm text-muted">
            Add your bike to start tracking oil, coolant, tyres and more.
          </p>
        </div>
        <Button disabled title="Coming in Phase 1">
          <Plus className="h-4 w-4" aria-hidden /> Add motorcycle
        </Button>
      </Card>
    </>
  )
}
