/**
 * "What's due?" logic — pure functions shared by the dashboard, on-device
 * notifications (Android) and the Vercel reminder cron job.
 */

export type DueStatus = 'ok' | 'due_soon' | 'overdue' | 'unknown'

export interface DueInput {
  /** Service every N km (null = not distance based). */
  intervalKm: number | null
  /** Service every N days (null = not time based). */
  intervalDays: number | null
  /** Odometer (km) at the last service, or the bike's starting odometer. */
  lastOdometer: number
  /** Date of the last service, or the bike's purchase / added date. */
  lastDate: Date | string
  currentOdometer: number
  /** Average riding distance, used to turn km left into an estimated date. */
  kmPerDay?: number | null
  today?: Date
  /** "Due soon" when less than this share of the km interval is left. Default 10%. */
  soonKmRatio?: number
  /**
   * "Due soon" when this many days or fewer are left. Default 14, but never more
   * than a quarter of the interval — otherwise a 14-day item (tyre pressure)
   * would be "due soon" from the day it was done.
   */
  soonDays?: number
}

export interface DueResult {
  status: DueStatus
  dueKm: number | null
  dueDate: Date | null
  kmLeft: number | null
  daysLeft: number | null
  /** Earliest of the time limit and the km limit converted to days (if km/day is known). */
  estimatedDaysLeft: number | null
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight UTC of the given date — makes day maths independent of time of day. */
function startOfDayUtc(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDayUtc(to) - startOfDayUtc(from)) / DAY_MS)
}

export function addDays(date: Date, days: number): Date {
  return new Date(startOfDayUtc(date) + days * DAY_MS)
}

export function computeDue(input: DueInput): DueResult {
  const {
    intervalKm,
    intervalDays,
    lastOdometer,
    currentOdometer,
    kmPerDay = null,
    today = new Date(),
    soonKmRatio = 0.1,
    soonDays = 14,
  } = input
  const lastDate = typeof input.lastDate === 'string' ? new Date(input.lastDate) : input.lastDate

  const hasKm = intervalKm != null && intervalKm > 0
  const hasDays = intervalDays != null && intervalDays > 0

  const dueKm = hasKm ? lastOdometer + intervalKm : null
  const kmLeft = dueKm != null ? dueKm - currentOdometer : null
  const dueDate = hasDays ? addDays(lastDate, intervalDays) : null
  const daysLeft = dueDate ? daysBetween(today, dueDate) : null

  const soonWindow = hasDays ? Math.min(soonDays, Math.ceil(intervalDays * 0.25)) : soonDays

  const kmAsDays =
    kmLeft != null && kmPerDay != null && kmPerDay > 0 ? Math.floor(kmLeft / kmPerDay) : null
  const candidates = [daysLeft, kmAsDays].filter((v): v is number => v != null)
  const estimatedDaysLeft = candidates.length ? Math.min(...candidates) : null

  let status: DueStatus
  if (!hasKm && !hasDays) {
    status = 'unknown'
  } else if ((kmLeft != null && kmLeft <= 0) || (daysLeft != null && daysLeft <= 0)) {
    status = 'overdue'
  } else if (
    (kmLeft != null && intervalKm != null && kmLeft <= intervalKm * soonKmRatio) ||
    (estimatedDaysLeft != null && estimatedDaysLeft <= soonWindow)
  ) {
    status = 'due_soon'
  } else {
    status = 'ok'
  }

  return { status, dueKm, dueDate, kmLeft, daysLeft, estimatedDaysLeft }
}

export interface OdometerReading {
  odometer: number
  recordedAt: Date | string
}

/**
 * Average km per day from odometer readings inside the look-back window.
 * Returns null when there isn't enough data (fewer than 2 readings or < 1 day apart).
 */
export function estimateKmPerDay(
  readings: OdometerReading[],
  { today = new Date(), windowDays = 90 }: { today?: Date; windowDays?: number } = {},
): number | null {
  const cutoff = addDays(today, -windowDays).getTime()
  const points = readings
    .map((r) => ({
      odometer: r.odometer,
      time: (typeof r.recordedAt === 'string' ? new Date(r.recordedAt) : r.recordedAt).getTime(),
    }))
    .filter((p) => p.time >= cutoff)
    .sort((a, b) => a.time - b.time)

  if (points.length < 2) return null
  const first = points[0]
  const last = points[points.length - 1]
  const days = (last.time - first.time) / DAY_MS
  const km = last.odometer - first.odometer
  if (days < 1 || km < 0) return null
  return km / days
}

const STATUS_RANK: Record<DueStatus, number> = { overdue: 0, due_soon: 1, ok: 2, unknown: 3 }

/** Sort comparator: overdue first, then due soon (soonest first), then ok, then unknown. */
export function compareByUrgency(a: DueResult, b: DueResult): number {
  const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
  if (rank !== 0) return rank
  const ad = a.estimatedDaysLeft ?? a.kmLeft ?? Number.POSITIVE_INFINITY
  const bd = b.estimatedDaysLeft ?? b.kmLeft ?? Number.POSITIVE_INFINITY
  return ad - bd
}
