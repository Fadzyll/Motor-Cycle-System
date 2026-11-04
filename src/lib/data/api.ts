/**
 * Supabase data access. Row-Level Security limits every query to the
 * signed-in user's own rows, so no user_id filters are needed for reads.
 */
import { supabase } from '@/lib/supabase'
import { isActiveByDefault } from '@/lib/maintenance/defaults'
import type {
  MaintenanceLog,
  MaintenanceType,
  Motorcycle,
  OdometerReading,
  Profile,
  Ride,
  ScheduleWithType,
} from './types'

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

// ─────────────────────────── profile ───────────────────────────

export async function getProfile(): Promise<Profile | null> {
  return check(await supabase.from('profiles').select('id, display_name, distance_unit, currency').maybeSingle())
}

// ─────────────────────────── bikes ─────────────────────────────

export async function listBikes(): Promise<Motorcycle[]> {
  return check(await supabase.from('motorcycles').select('*').order('created_at'))
}

export async function getBike(id: string): Promise<Motorcycle | null> {
  return check(await supabase.from('motorcycles').select('*').eq('id', id).maybeSingle())
}

export type BikeInput = Pick<
  Motorcycle,
  'nickname' | 'make' | 'model' | 'year' | 'engine_cc' | 'plate_number' | 'current_odometer' | 'purchase_date'
>

/** Creates the bike, its maintenance schedule (from the default items) and the first odometer reading. */
export async function createBike(input: BikeInput, opts: { isScooter: boolean }): Promise<Motorcycle> {
  const bike = check<Motorcycle>(await supabase.from('motorcycles').insert(input).select().single())

  try {
    const types = await listDefaultTypes()
    check(
      await supabase.from('maintenance_schedules').insert(
        types.map((t) => ({
          motorcycle_id: bike.id,
          maintenance_type_id: t.id,
          interval_km: t.default_interval_km,
          interval_days: t.default_interval_days,
          active: isActiveByDefault(t, opts.isScooter),
        })),
      ),
    )
    if (bike.current_odometer != null) {
      check(
        await supabase
          .from('odometer_readings')
          .insert({ motorcycle_id: bike.id, odometer: bike.current_odometer }),
      )
    }
  } catch (err) {
    // Don't leave a half-created bike behind.
    await supabase.from('motorcycles').delete().eq('id', bike.id)
    throw err
  }
  return bike
}

/** Edits bike details. Changing current_odometer here is a correction, so no reading is recorded. */
export async function updateBike(id: string, input: Partial<BikeInput>): Promise<Motorcycle> {
  return check(await supabase.from('motorcycles').update(input).eq('id', id).select().single())
}

export async function deleteBike(id: string): Promise<void> {
  check(await supabase.from('motorcycles').delete().eq('id', id))
}

/** Records a new odometer reading (used for the km/day estimate) and updates the bike. */
export async function updateOdometer(bike: Motorcycle, odometer: number): Promise<void> {
  if (bike.current_odometer != null && odometer < bike.current_odometer) {
    throw new Error(`The new reading is lower than the current ${bike.current_odometer} km. Use "Edit bike" to correct a mistake.`)
  }
  check(await supabase.from('odometer_readings').insert({ motorcycle_id: bike.id, odometer }))
  check(await supabase.from('motorcycles').update({ current_odometer: odometer }).eq('id', bike.id))
}

// ───────────────────────── maintenance types ───────────────────

export async function listDefaultTypes(): Promise<MaintenanceType[]> {
  return check(await supabase.from('maintenance_types').select('*').is('user_id', null).order('sort_order'))
}

// ─────────────────────────── schedules ─────────────────────────

const SCHEDULE_SELECT = '*, maintenance_types(*)'

/** All schedules of all the user's bikes (or one bike). */
export async function listSchedules(bikeId?: string): Promise<ScheduleWithType[]> {
  let q = supabase.from('maintenance_schedules').select(SCHEDULE_SELECT)
  if (bikeId) q = q.eq('motorcycle_id', bikeId)
  const rows = check<ScheduleWithType[]>(await q)
  return rows.sort(
    (a, b) =>
      a.maintenance_types.sort_order - b.maintenance_types.sort_order ||
      a.maintenance_types.name.localeCompare(b.maintenance_types.name),
  )
}

export interface ScheduleUpdate {
  id: string
  interval_km: number | null
  interval_days: number | null
  active: boolean
}

export async function updateSchedules(updates: ScheduleUpdate[]): Promise<void> {
  const results = await Promise.all(
    updates.map(({ id, ...values }) => supabase.from('maintenance_schedules').update(values).eq('id', id)),
  )
  results.forEach(check)
}

/** Adds the user's own maintenance item (e.g. "Fork oil") to a bike. */
export async function addCustomItem(
  bikeId: string,
  item: { name: string; interval_km: number | null; interval_days: number | null },
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not signed in')
  const type = check<MaintenanceType>(
    await supabase
      .from('maintenance_types')
      .insert({
        user_id: userData.user.id,
        name: item.name,
        default_interval_km: item.interval_km,
        default_interval_days: item.interval_days,
        icon: 'wrench',
        sort_order: 1000,
      })
      .select()
      .single(),
  )
  check(
    await supabase.from('maintenance_schedules').insert({
      motorcycle_id: bikeId,
      maintenance_type_id: type.id,
      interval_km: item.interval_km,
      interval_days: item.interval_days,
      active: true,
    }),
  )
}

// ───────────────────────────── logs ────────────────────────────

export async function listLogs(bikeId?: string): Promise<MaintenanceLog[]> {
  let q = supabase
    .from('maintenance_logs')
    .select('*')
    .order('performed_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (bikeId) q = q.eq('motorcycle_id', bikeId)
  return check(await q)
}

export interface ServiceInput {
  performedAt: string // YYYY-MM-DD
  /** null = meter broken / unknown. */
  odometer: number | null
  items: { typeId: string; cost: number | null }[]
  workshopName: string | null
  notes: string | null
}

/** Logs one workshop visit: one row per item done, plus odometer bookkeeping. */
export async function logService(bike: Motorcycle, input: ServiceInput): Promise<void> {
  if (input.items.length === 0) throw new Error('Pick at least one item')
  check(
    await supabase.from('maintenance_logs').insert(
      input.items.map((item) => ({
        motorcycle_id: bike.id,
        maintenance_type_id: item.typeId,
        performed_at: input.performedAt,
        odometer: input.odometer,
        cost: item.cost,
        workshop_name: input.workshopName,
        notes: input.notes,
      })),
    ),
  )
  if (input.odometer == null) return
  check(
    await supabase.from('odometer_readings').insert({
      motorcycle_id: bike.id,
      odometer: input.odometer,
      recorded_at: `${input.performedAt}T12:00:00Z`,
    }),
  )
  if (bike.current_odometer == null || input.odometer > bike.current_odometer) {
    check(await supabase.from('motorcycles').update({ current_odometer: input.odometer }).eq('id', bike.id))
  }
}

export async function deleteLog(id: string): Promise<void> {
  check(await supabase.from('maintenance_logs').delete().eq('id', id))
}

// ─────────────────────────── readings ──────────────────────────

/** Readings from the last ~120 days (enough for the km/day estimate) plus each bike's first reading. */
export async function listReadings(bikeId?: string): Promise<OdometerReading[]> {
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
  let recent = supabase.from('odometer_readings').select('*').gte('recorded_at', since)
  let first = supabase.from('odometer_readings').select('*').order('recorded_at').limit(bikeId ? 1 : 1000)
  if (bikeId) {
    recent = recent.eq('motorcycle_id', bikeId)
    first = first.eq('motorcycle_id', bikeId)
  }
  const [a, b] = await Promise.all([recent, first])
  const rows = [...check<OdometerReading[]>(a), ...check<OdometerReading[]>(b)]
  return [...new Map(rows.map((r) => [r.id, r])).values()]
}

// ───────────────────────────── rides ───────────────────────────

export async function listRides(bikeId: string, limit = 10): Promise<Ride[]> {
  return check(
    await supabase
      .from('rides')
      .select('*')
      .eq('motorcycle_id', bikeId)
      .order('started_at', { ascending: false })
      .limit(limit),
  )
}

export interface RideInput {
  startedAt: string
  endedAt: string
  distanceKm: number
  durationS: number
  maxSpeedKmh: number | null
}

/**
 * Saves a GPS ride and adds its distance to the bike's odometer.
 * A bike without an odometer (broken meter) starts counting from 0 km at the ride start,
 * so km-based items are tracked from then on.
 */
export async function saveRide(bike: Motorcycle, ride: RideInput): Promise<void> {
  check(
    await supabase.from('rides').insert({
      motorcycle_id: bike.id,
      started_at: ride.startedAt,
      ended_at: ride.endedAt,
      distance_km: Math.round(ride.distanceKm * 100) / 100,
      duration_s: Math.round(ride.durationS),
      max_speed_kmh: ride.maxSpeedKmh == null ? null : Math.round(ride.maxSpeedKmh * 10) / 10,
    }),
  )

  const start = bike.current_odometer ?? 0
  const end = start + Math.round(ride.distanceKm)
  const readings = [{ motorcycle_id: bike.id, odometer: end, recorded_at: ride.endedAt }]
  if (bike.current_odometer == null) readings.unshift({ motorcycle_id: bike.id, odometer: 0, recorded_at: ride.startedAt })
  check(await supabase.from('odometer_readings').insert(readings))
  if (end !== bike.current_odometer) {
    check(await supabase.from('motorcycles').update({ current_odometer: end }).eq('id', bike.id))
  }
}
