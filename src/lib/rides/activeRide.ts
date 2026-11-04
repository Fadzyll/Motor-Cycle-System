import type { DistanceState } from './distance'

/** The ride in progress, saved on the device so a reload doesn't lose it. */
export interface ActiveRide {
  bikeId: string
  startedAt: string
  /** Set when the rider taps Stop (waiting for Save / Discard). */
  endedAt: string | null
  distanceM: number
  maxSpeedMs: number
}

const KEY = 'active-ride'

export function loadActiveRide(): ActiveRide | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const r = JSON.parse(raw) as ActiveRide
    return typeof r?.bikeId === 'string' && typeof r.startedAt === 'string' ? r : null
  } catch {
    return null
  }
}

export function saveActiveRide(ride: ActiveRide | null) {
  try {
    if (ride) localStorage.setItem(KEY, JSON.stringify(ride))
    else localStorage.removeItem(KEY)
  } catch {
    // storage blocked: the ride still works until the page is closed
  }
}

export function distanceStateFrom(ride: ActiveRide): DistanceState {
  // The last point isn't kept across reloads, so no distance is invented for the gap.
  return { distanceM: ride.distanceM, maxSpeedMs: ride.maxSpeedMs, last: null }
}
