import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'

export function BikesPage() {
  return (
    <>
      <PageHeader title="My bikes" />
      <Card className="text-sm text-muted">Bike list and service logs are coming in Phase 1.</Card>
    </>
  )
}
