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

/**
 * Starting point for items never serviced: the odometer reading taken when the
 * bike was added. Readings from back-dated services are ignored here, otherwise
 * logging an old service would make never-serviced items look overdue.
 */
function baseline(input: BikeStatusInput): { date: Date; odometer: number } {
  const addedAt = new Date(input.bike.created_at).getTime() - 60_000
  const first = input.readings
    .filter((r) => r.motorcycle_id === input.bike.id && new Date(r.recorded_at).getTime() >= addedAt)
    .reduce<BikeStatusInput['readings'][number] | null>(
      (min, r) => (min == null || r.recorded_at < min.recorded_at ? r : min),
      null,
    )
  return {
    date: localDateOf(input.bike.created_at),
    odometer: first ? first.odometer : input.bike.current_odometer,
  }
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
