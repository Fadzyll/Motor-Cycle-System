import type { MaintenanceLog } from '@/lib/data/types'

export interface ServiceVisit {
  key: string
  performedAt: string
  odometer: number | null
  workshopName: string | null
  notes: string | null
  logs: MaintenanceLog[]
  total: number | null
}

/** Groups individual item logs into visits (same date, odometer and workshop), newest first. */
export function groupIntoVisits(logs: MaintenanceLog[]): ServiceVisit[] {
  const visits = new Map<string, ServiceVisit>()
  for (const log of logs) {
    const key = `${log.performed_at}|${log.odometer}|${log.workshop_name ?? ''}`
    let visit = visits.get(key)
    if (!visit) {
      visit = {
        key,
        performedAt: log.performed_at,
        odometer: log.odometer,
        workshopName: log.workshop_name,
        notes: log.notes,
        logs: [],
        total: null,
      }
      visits.set(key, visit)
    }
    visit.logs.push(log)
    if (log.cost != null) visit.total = (visit.total ?? 0) + Number(log.cost)
    if (!visit.notes && log.notes) visit.notes = log.notes
  }
  return [...visits.values()].sort(
    (a, b) => b.performedAt.localeCompare(a.performedAt) || (b.odometer ?? 0) - (a.odometer ?? 0),
  )
}

export function totalSpent(logs: MaintenanceLog[]): number {
  return logs.reduce((sum, l) => sum + (l.cost != null ? Number(l.cost) : 0), 0)
}
