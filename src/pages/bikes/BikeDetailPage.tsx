import { CalendarClock, Gauge, History, Lightbulb, Navigation, Pencil, Plus, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { OdometerDialog } from '@/components/bikes/OdometerDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { DueItemRow } from '@/components/maintenance/DueItemRow'
import { ServiceLifeChart } from '@/components/maintenance/ServiceLifeChart'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingState } from '@/components/ui/feedback'
import { useBikeStatus } from '@/lib/data/hooks'
import { bikeSubtitle, formatDate, formatKm } from '@/lib/format'
import type { StatusItem } from '@/lib/maintenance/status'

function Section({
  title,
  subtitle,
  items,
  bikeId,
}: {
  title: string
  subtitle?: string
  items: StatusItem[]
  bikeId: string
}) {
  if (!items.length) return null
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title} ({items.length})
      </h2>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      <div className="mb-2" />
      <Card className="overflow-hidden p-0">
        {/* -mb-px hides the last row's bottom border inside the card */}
        <div className="-mb-px grid grid-cols-1 lg:grid-cols-2">
          {items.map((item) => (
            <div key={item.scheduleId} className="border-b border-border lg:odd:border-r">
              <DueItemRow item={item} bikeId={bikeId} />
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}

export function BikeDetailPage() {
  const { bikeId = '' } = useParams()
  const navigate = useNavigate()
  const { bike, items, isPending, error } = useBikeStatus(bikeId)
  const [odoOpen, setOdoOpen] = useState(false)

  if (isPending) return <LoadingState />
  if (error) return <ErrorState error={error} />
  if (!bike || !items) return <ErrorState error="Motorcycle not found" />

  const lastService = items
    .map((i) => i.lastService?.performedAt)
    .filter(Boolean)
    .sort()
    .at(-1)

  return (
    <>
      <PageHeader
        title={bike.nickname}
        subtitle={bikeSubtitle(bike) || undefined}
        backTo="/bikes"
        action={
          <Button variant="ghost" size="icon" aria-label="Edit bike" onClick={() => navigate(`/bikes/${bike.id}/edit`)}>
            <Pencil className="h-5 w-5" aria-hidden />
          </Button>
        }
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div>
          <Card className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <Gauge className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Odometer</p>
              {bike.current_odometer == null ? (
                <>
                  <p className="text-xl font-bold">Not set</p>
                  <p className="text-xs text-muted">Tracking by date only</p>
                </>
              ) : (
                <p className="text-xl font-bold">{formatKm(bike.current_odometer)}</p>
              )}
              {lastService && (
                <p className="flex items-center gap-1 text-xs text-muted">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Last service {formatDate(lastService)}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => setOdoOpen(true)}>
              + Add km
            </Button>
          </Card>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button size="lg" className="col-span-3" onClick={() => navigate(`/bikes/${bike.id}/service/new`)}>
              <Plus className="h-5 w-5" aria-hidden /> Log service
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="col-span-3"
              onClick={() => navigate(`/bikes/${bike.id}/ride`)}
            >
              <Navigation className="h-5 w-5 text-primary" aria-hidden /> Start ride (GPS)
            </Button>
            <Link
              to={`/bikes/${bike.id}/history`}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-bg col-span-1"
            >
              <History className="h-4 w-4" aria-hidden /> History
            </Link>
            <Link
              to={`/bikes/${bike.id}/schedule`}
              className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-bg"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Maintenance schedule
            </Link>
          </div>

          {!lastService && items.length > 0 && (
            <Card className="mt-4 flex items-start gap-3 border-primary/40 bg-primary/5 text-sm">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium">Serviced before you added this bike?</p>
                <p className="mt-1 text-muted">
                  Log your recent services with the <strong className="text-fg">date they were done</strong> (and the km
                  at the time, if you know it). The bars and due dates then start from that service instead of today.
                </p>
                <Link
                  to={`/bikes/${bike.id}/service/new`}
                  className="mt-2 inline-block font-medium text-primary underline"
                >
                  Log a past service
                </Link>
              </div>
            </Card>
          )}
        </div>

        <div className="mt-6 lg:mt-0">
          <ServiceLifeChart items={items} bikeId={bike.id} />
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {items.length === 0 ? (
          <Card className="text-sm text-muted">
            No maintenance items are switched on. Open <strong>Maintenance schedule</strong> to choose what to track.
          </Card>
        ) : (
          <>
            {/* items are already sorted: overdue → due soon → OK → can't calculate */}
            <Section
              title="Maintenance items"
              subtitle="Most urgent first. Tap an item to log that service — past services are under History."
              items={items}
              bikeId={bike.id}
            />
          </>
        )}
      </div>

      <OdometerDialog bike={bike} open={odoOpen} onClose={() => setOdoOpen(false)} />
    </>
  )
}
