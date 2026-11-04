import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { DueItemRow } from '@/components/maintenance/DueItemRow'
import { Card } from '@/components/ui/card'
import type { BikeWithStatus } from '@/lib/data/hooks'
import { bikeSubtitle, formatKm } from '@/lib/format'
import { countByStatus } from '@/lib/maintenance/status'

/** A bike with its most urgent items — used on the dashboard. */
export function BikeSummaryCard({ data, maxItems = 3 }: { data: BikeWithStatus; maxItems?: number }) {
  const { bike, items } = data
  const counts = countByStatus(items)
  const urgent = items.filter((i) => i.due.status === 'overdue' || i.due.status === 'due_soon')
  const shown = (urgent.length ? urgent : items).slice(0, maxItems)

  return (
    <Card className="overflow-hidden p-0">
      <Link to={`/bikes/${bike.id}`} className="flex items-center gap-3 p-4 hover:bg-bg">
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{bike.nickname}</p>
          {bikeSubtitle(bike) && <p className="truncate text-sm text-muted">{bikeSubtitle(bike)}</p>}
          <p className="text-sm text-muted">{formatKm(bike.current_odometer)}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
      </Link>

      <div className="flex gap-2 border-t border-border px-4 py-2 text-xs font-medium">
        <span className={counts.overdue ? 'text-danger' : 'text-muted'}>{counts.overdue} overdue</span>
        <span className="text-muted">·</span>
        <span className={counts.dueSoon ? 'text-warn' : 'text-muted'}>{counts.dueSoon} due soon</span>
        <span className="text-muted">·</span>
        <span className="text-muted">{counts.ok} OK</span>
      </div>

      {shown.length > 0 && (
        <div className="divide-y divide-border border-t border-border">
          {shown.map((item) => (
            <DueItemRow key={item.scheduleId} item={item} bikeId={bike.id} />
          ))}
        </div>
      )}
    </Card>
  )
}
