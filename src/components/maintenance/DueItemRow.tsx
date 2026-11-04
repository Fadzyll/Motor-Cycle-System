import { Link } from 'react-router'
import type { StatusItem } from '@/lib/maintenance/status'
import { dueSummary } from '@/lib/maintenance/summary'
import { cn } from '@/lib/utils'
import { ItemIcon } from './ItemIcon'
import { StatusBadge } from './StatusBadge'

export function DueItemRow({
  item,
  bikeId,
  subtitle,
}: {
  item: StatusItem
  bikeId: string
  subtitle?: string
}) {
  return (
    <Link
      to={`/bikes/${bikeId}/service/new?item=${item.typeId}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-bg"
      aria-label={`${item.name}: ${dueSummary(item)}. Log this service`}
    >
      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
          item.due.status === 'overdue'
            ? 'bg-danger/15 text-danger'
            : item.due.status === 'due_soon'
              ? 'bg-warn/15 text-warn'
              : 'bg-bg text-muted',
        )}
      >
        <ItemIcon icon={item.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.name}</span>
        <span className="block truncate text-xs text-muted">{subtitle ?? dueSummary(item)}</span>
      </span>
      <StatusBadge status={item.due.status} />
    </Link>
  )
}
