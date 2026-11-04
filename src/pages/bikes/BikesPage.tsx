import { ChevronRight, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { EmptyBikes } from '@/components/bikes/EmptyBikes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingState } from '@/components/ui/feedback'
import { useBikes } from '@/lib/data/hooks'
import { bikeSubtitle, formatKm } from '@/lib/format'

export function BikesPage() {
  const navigate = useNavigate()
  const { data: bikes, isPending, error } = useBikes()

  return (
    <>
      <PageHeader
        title="My bikes"
        action={
          <Button onClick={() => navigate('/bikes/new')}>
            <Plus className="h-4 w-4" aria-hidden /> Add
          </Button>
        }
      />
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : !bikes?.length ? (
        <EmptyBikes />
      ) : (
        <Card className="divide-y divide-border p-0">
          {bikes.map((bike) => (
            <Link key={bike.id} to={`/bikes/${bike.id}`} className="flex items-center gap-3 p-4 hover:bg-bg">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{bike.nickname}</p>
                <p className="truncate text-sm text-muted">
                  {[bikeSubtitle(bike), formatKm(bike.current_odometer)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
            </Link>
          ))}
        </Card>
      )}
    </>
  )
}
