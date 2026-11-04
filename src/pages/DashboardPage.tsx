import { CheckCircle2, Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { BikeSummaryCard } from '@/components/bikes/BikeSummaryCard'
import { EmptyBikes } from '@/components/bikes/EmptyBikes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingState } from '@/components/ui/feedback'
import { useAllBikeStatus } from '@/lib/data/hooks'

export function DashboardPage() {
  const navigate = useNavigate()
  const { data, isPending, error } = useAllBikeStatus()

  const attention = data?.reduce(
    (n, b) => n + b.items.filter((i) => i.due.status === 'overdue' || i.due.status === 'due_soon').length,
    0,
  )

  return (
    <>
      <PageHeader
        title="Dashboard"
        action={
          data && data.length > 0 ? (
            <Button variant="outline" onClick={() => navigate('/bikes/new')} aria-label="Add motorcycle">
              <Plus className="h-4 w-4" aria-hidden /> Bike
            </Button>
          ) : undefined
        }
      />

      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : !data || data.length === 0 ? (
        <EmptyBikes />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {attention === 0 && (
            <Card className="flex items-center gap-3 text-sm lg:col-span-full">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" aria-hidden />
              All good — nothing is due soon.
            </Card>
          )}
          {data.map((b) => (
            <BikeSummaryCard key={b.bike.id} data={b} />
          ))}
        </div>
      )}
    </>
  )
}
