import type { DueStatus } from '@/lib/maintenance/due'
import { cn } from '@/lib/utils'

const styles: Record<DueStatus, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'bg-danger/15 text-danger' },
  due_soon: { label: 'Due soon', className: 'bg-warn/15 text-warn' },
  ok: { label: 'OK', className: 'bg-ok/15 text-ok' },
  unknown: { label: 'Unknown', className: 'bg-border text-muted' },
}

export function StatusBadge({ status, className }: { status: DueStatus; className?: string }) {
  const s = styles[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  )
}
