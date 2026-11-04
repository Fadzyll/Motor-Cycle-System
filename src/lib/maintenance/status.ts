import { localDateOf, localToday, parseDateOnly } from '@/lib/dates'
import type { MaintenanceLog, Motorcycle, OdometerReading, ScheduleWithType } from '@/lib/data/types'
import { compareByUrgency, computeDue, estimateKmPerDay, type DueResult } from './due'

export interface StatusItem {
  scheduleId: string
  typeId: string
  name: string
  icon: string | null
  intervalKm: number | null
  intervalDays: number | null
  lastService: { performedAt: string; odometer: number } | null
  due: DueResult
}

export interface BikeStatusInput {
  bike: Pick<Motorcycle, 'id' | 'current_odometer' | 'created_at'>
  schedules: ScheduleWithType[]
  logs: Pick<MaintenanceLog, 'motorcycle_id' | 'maintenance_type_id' | 'performed_at' | 'odometer'>[]
  readings: Pick<OdometerReading, 'motorcycle_id' | 'odometer' | 'recorded_at'>[]
  today?: Date
}

/** Starting point for items never serviced: the first odometer reading (when the bike was added). */
function baseline(input: BikeStatusInput): { date: Date; odometer: number } {
  const first = input.readings
    .filter((r) => r.motorcycle_id === input.bike.id)
    .reduce<BikeStatusInput['readings'][number] | null>(
      (min, r) => (min == null || r.recorded_at < min.recorded_at ? r : min),
      null,
    )
  return first
    ? { date: localDateOf(first.recorded_at), odometer: first.odometer }
    : { date: localDateOf(input.bike.created_at), odometer: input.bike.current_odometer }
}

/** Due status of every active maintenance item of one bike, most urgent first. */
export function buildBikeStatus(input: BikeStatusInput): StatusItem[] {
  const today = input.today ?? localToday()
  const base = baseline(input)
  const kmPerDay = estimateKmPerDay(
    input.readings
      .filter((r) => r.motorcycle_id === input.bike.id)
      .map((r) => ({ odometer: r.odometer, recordedAt: r.recorded_at })),
    { today },
  )

  // Latest service per maintenance type.
  const latest = new Map<string, BikeStatusInput['logs'][number]>()
  for (const log of input.logs) {
    if (log.motorcycle_id !== input.bike.id) continue
    const prev = latest.get(log.maintenance_type_id)
    if (
      !prev ||
      log.performed_at > prev.performed_at ||
      (log.performed_at === prev.performed_at && log.odometer > prev.odometer)
    ) {
      latest.set(log.maintenance_type_id, log)
    }
  }

  const items = input.schedules
    .filter((s) => s.active && s.motorcycle_id === input.bike.id)
    .map<StatusItem>((s) => {
      const last = latest.get(s.maintenance_type_id) ?? null
      return {
        scheduleId: s.id,
        typeId: s.maintenance_type_id,
        name: s.maintenance_types.name,
        icon: s.maintenance_types.icon,
        intervalKm: s.interval_km,
        intervalDays: s.interval_days,
        lastService: last ? { performedAt: last.performed_at, odometer: last.odometer } : null,
        due: computeDue({
          intervalKm: s.interval_km,
          intervalDays: s.interval_days,
          lastOdometer: last ? last.odometer : base.odometer,
          lastDate: last ? parseDateOnly(last.performed_at) : base.date,
          currentOdometer: input.bike.current_odometer,
          kmPerDay,
          today,
        }),
      }
    })

  return items.sort((a, b) => compareByUrgency(a.due, b.due) || a.name.localeCompare(b.name))
}

export function countByStatus(items: StatusItem[]) {
  return {
    overdue: items.filter((i) => i.due.status === 'overdue').length,
    dueSoon: items.filter((i) => i.due.status === 'due_soon').length,
    ok: items.filter((i) => i.due.status === 'ok').length,
  }
}
