/**
 * Turning what the rider types into odometer readings.
 * Riders can give either the meter reading or "km ridden" — useful when the
 * meter is broken or they only know how far they've ridden since a service.
 */

export type ServiceKmMode = 'reading' | 'since'

/**
 * Odometer at a service.
 * - 'reading': the value is the odometer at the service.
 * - 'since': the value is km ridden since the service, so odometer = current − value.
 */
export function serviceOdometer(
  mode: ServiceKmMode,
  value: number | null,
  current: number | null,
): { ok: true; odometer: number | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, odometer: null }
  if (!Number.isInteger(value) || value < 0) return { ok: false, error: 'Enter whole km' }
  if (mode === 'reading') return { ok: true, odometer: value }
  if (current == null) return { ok: false, error: 'Set the odometer first, or enter the reading instead' }
  if (value > current) return { ok: false, error: `That's more than the ${current} km on the odometer` }
  return { ok: true, odometer: current - value }
}

/** New odometer after "add km ridden". A bike without an odometer starts from 0. */
export function addKm(current: number | null, km: number): number {
  return (current ?? 0) + km
}
