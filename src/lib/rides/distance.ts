/**
 * Ride distance from GPS fixes.
 *
 * Raw GPS wanders a few metres even when you're standing still, and sometimes
 * jumps hundreds of metres for one reading. Summing raw points would add fake km,
 * so a fix only counts when it is accurate, far enough from the last counted
 * point, and reached at a believable speed.
 */

export interface Fix {
  lat: number
  lng: number
  /** Accuracy radius in metres (from the device). */
  accuracy: number
  /** Milliseconds since epoch. */
  timestamp: number
}

export interface DistanceState {
  distanceM: number
  maxSpeedMs: number
  /** Last point that was counted (or the starting point). */
  last: Fix | null
}

export const MAX_ACCURACY_M = 50 // ignore fixes worse than this
export const MIN_STEP_M = 10 // ignore movement smaller than this (or than the accuracy)
export const MAX_SPEED_MS = 70 // ~250 km/h — anything faster is a GPS glitch

export const initialDistanceState: DistanceState = { distanceM: 0, maxSpeedMs: 0, last: null }

const EARTH_RADIUS_M = 6_371_000
const rad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance between two points in metres (haversine formula). */
export function haversineM(a: Pick<Fix, 'lat' | 'lng'>, b: Pick<Fix, 'lat' | 'lng'>): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** Adds one GPS fix to the running total. Pure: returns a new state. */
export function addFix(state: DistanceState, fix: Fix): DistanceState {
  if (!Number.isFinite(fix.lat) || !Number.isFinite(fix.lng) || fix.accuracy > MAX_ACCURACY_M) return state
  const { last } = state
  if (!last) return { ...state, last: fix }

  const seconds = (fix.timestamp - last.timestamp) / 1000
  if (seconds <= 0) return state

  const step = haversineM(last, fix)
  if (step < Math.max(MIN_STEP_M, fix.accuracy)) return state // standing still / jitter

  const speed = step / seconds
  if (speed > MAX_SPEED_MS) return state // glitch: keep the old point

  return {
    distanceM: state.distanceM + step,
    maxSpeedMs: Math.max(state.maxSpeedMs, speed),
    last: fix,
  }
}
