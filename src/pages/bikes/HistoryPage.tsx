import { ClipboardList, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { ErrorState, FormError, LoadingState } from '@/components/ui/feedback'
import { useBike, useCurrency, useDeleteLog, useLogs, useSchedules } from '@/lib/data/hooks'
import type { MaintenanceLog } from '@/lib/data/types'
import { formatDate, formatKm, formatMoney } from '@/lib/format'
import { groupIntoVisits, totalSpent } from '@/lib/maintenance/history'

export function HistoryPage() {
  const { bikeId = '' } = useParams()
  const currency = useCurrency()
  const bike = useBike(bikeId)
  const logs = useLogs(bikeId)
  const schedules = useSchedules(bikeId)
  const remove = useDeleteLog()
  const [toDelete, setToDelete] = useState<MaintenanceLog | null>(null)

  const names = useMemo(
    () => new Map(schedules.data?.map((s) => [s.maintenance_type_id, s.maintenance_types.name])),
    [schedules.data],
  )
  const visits = useMemo(() => groupIntoVisits(logs.data ?? []), [logs.data])

  if (bike.isPending || logs.isPending || schedules.isPending) return <LoadingState />
  const error = bike.error ?? logs.error ?? schedules.error
  if (error) return <ErrorState error={error} />
  if (!bike.data) return <ErrorState error="Motorcycle not found" />

  const spent = totalSpent(logs.data ?? [])

  return (
    <div className="max-w-2xl">
      <PageHeader title="Service history" subtitle={bike.data.nickname} backTo={`/bikes/${bikeId}`} />

      {visits.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted">
          <ClipboardList className="h-8 w-8" aria-hidden />
          No services logged yet.
        </Card>
      ) : (
        <>
          <Card className="mb-4 grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-xs text-muted">Services</p>
              <p className="text-xl font-bold">{visits.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Total spent</p>
              <p className="text-xl font-bold">{formatMoney(spent, currency)}</p>
            </div>
          </Card>

          <ol className="space-y-3">
            {visits.map((visit) => (
              <li key={visit.key}>
                <Card className="p-0">
                  <div className="flex items-start justify-between gap-3 p-4 pb-2">
                    <div>
                      <p className="font-semibold">{formatDate(visit.performedAt)}</p>
                      <p className="text-sm text-muted">
                        {[visit.odometer != null && formatKm(visit.odometer), visit.workshopName].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {visit.total != null && <p className="font-semibold">{formatMoney(visit.total, currency)}</p>}
                  </div>
                  <ul className="divide-y divide-border border-t border-border">
                    {visit.logs.map((log) => (
                      <li key={log.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                        <span className="flex-1">{names.get(log.maintenance_type_id) ?? 'Removed item'}</span>
                        {log.cost != null && (
                          <span className="text-muted">{formatMoney(Number(log.cost), currency)}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted"
                          aria-label={`Delete ${names.get(log.maintenance_type_id) ?? 'entry'}`}
                          onClick={() => setToDelete(log)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {visit.notes && <p className="border-t border-border px-4 py-2 text-sm text-muted">{visit.notes}</p>}
                </Card>
              </li>
            ))}
          </ol>
        </>
      )}

      <Dialog open={toDelete != null} onClose={() => setToDelete(null)} title="Delete this entry?">
        <p className="text-sm text-muted">
          {toDelete && `${names.get(toDelete.maintenance_type_id) ?? 'Entry'} on ${formatDate(toDelete.performed_at)}`}
          . The due date for this item will be recalculated.
        </p>
        <FormError error={remove.error} />
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={remove.isPending}
            onClick={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
          >
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
