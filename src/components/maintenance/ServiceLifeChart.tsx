import { Activity } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/card'
import type { StatusItem } from '@/lib/maintenance/status'
import { dueSummary } from '@/lib/maintenance/summary'
import { cn } from '@/lib/utils'
import { LifeBar } from './LifeBar'

/** Bar chart of the items with the most service life used — what will be due next. */
export function ServiceLifeChart({ items, bikeId, max = 5 }: { items: StatusItem[]; bikeId: string; max?: number }) {
  const ranked = items
    .filter((i) => i.due.usedRatio != null)
    .sort((a, b) => b.due.usedRatio! - a.due.usedRatio!)
    .slice(0, max)

  return (
    <Card>
      <div className="mb-4 flex items-start gap-3">
        <Activity className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="font-semibold">Service life used</h2>
          <p className="text-xs text-muted">Fills up as you ride and as time passes since each service. 100% = due.</p>
        </div>
      </div>
      {ranked.length === 0 ? (
        <p className="text-sm text-muted">No items with an interval yet.</p>
      ) : (
        <ul className="space-y-4">
          {ranked.map((item) => {
            const pct = Math.round(item.due.usedRatio! * 100)
            return (
              <li key={item.scheduleId}>
                <Link to={`/bikes/${bikeId}/service/new?item=${item.typeId}`} className="group block">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium group-hover:underline">{item.name}</span>
                    <span
                      className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        item.due.status === 'overdue'
                          ? 'text-danger'
                          : item.due.status === 'due_soon'
                            ? 'text-warn'
                            : 'text-muted',
                      )}
                    >
                      {pct}%
                    </span>
                  </div>
                  <LifeBar ratio={item.due.usedRatio} status={item.due.status} label={item.name} className="h-2.5" />
                  <p className="mt-1 truncate text-xs text-muted">{dueSummary(item)}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
