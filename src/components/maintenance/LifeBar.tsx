import type { DueStatus } from '@/lib/maintenance/due'
import { cn } from '@/lib/utils'

const fill: Record<DueStatus, string> = {
  overdue: 'bg-danger',
  due_soon: 'bg-warn',
  ok: 'bg-ok',
  unknown: 'bg-muted',
}

/**
 * "Quota" bar: how much of an item's service interval is used up.
 * Fills from 0% (just serviced) to 100% (due); stays full and red when overdue.
 */
export function LifeBar({
  ratio,
  status,
  label,
  className,
}: {
  ratio: number | null
  status: DueStatus
  label: string
  className?: string
}) {
  if (ratio == null) return null
  const pct = Math.round(ratio * 100)
  return (
    <div
      role="progressbar"
      aria-label={`${label}: ${pct}% of service interval used`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(pct, 100)}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-border', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width]', fill[status])}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}
