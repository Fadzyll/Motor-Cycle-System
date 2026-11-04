import { MapPin } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'

export function WorkshopsPage() {
  return (
    <>
      <PageHeader title="Nearby workshops" />
      <Card className="flex items-start gap-3 text-sm">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p className="text-muted">
          The workshop map is coming in Phase 2. The app will only ask for your location when you
          tap <strong>Use my location</strong>.
        </p>
      </Card>
    </>
  )
}
