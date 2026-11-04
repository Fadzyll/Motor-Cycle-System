import { useCallback, useEffect, useRef, useState } from 'react'
import { keepScreenOn, watchPosition } from '@/native/location'
import { loadActiveRide, saveActiveRide, distanceStateFrom, type ActiveRide } from './activeRide'
import { addFix, initialDistanceState, type DistanceState } from './distance'

export type RideStatus = 'idle' | 'waiting_gps' | 'tracking' | 'stopped' | 'other_bike'

export function useRideTracker(bikeId: string) {
  const [ride, setRide] = useState<ActiveRide | null>(() => loadActiveRide())
  const [error, setError] = useState<string | null>(null)
  const [gps, setGps] = useState<{ accuracy: number; speedKmh: number | null } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const distRef = useRef<DistanceState>(ride ? distanceStateFrom(ride) : initialDistanceState)

  const mine = ride?.bikeId === bikeId
  const running = mine && ride.endedAt == null

  const update = useCallback((next: ActiveRide | null) => {
    saveActiveRide(next)
    setRide(next)
  }, [])

  // Watch GPS while the ride is running.
  useEffect(() => {
    if (!running) return
    const stop = watchPosition(
      (fix) => {
        setError(null)
        setGps({ accuracy: fix.accuracy, speedKmh: fix.speedMs == null ? null : fix.speedMs * 3.6 })
        const next = addFix(distRef.current, fix)
        distRef.current = next
        setRide((r) => {
          if (!r || r.endedAt) return r
          if (r.distanceM === next.distanceM && r.maxSpeedMs === next.maxSpeedMs) return r
          const updated = { ...r, distanceM: next.distanceM, maxSpeedMs: next.maxSpeedMs }
          saveActiveRide(updated)
          return updated
        })
      },
      (message, denied) => {
        setError(message)
        if (denied) {
          // Never got permission: drop the empty ride so the Start button comes back.
          setRide((r) => {
            if (r && !r.endedAt && r.distanceM === 0) {
              saveActiveRide(null)
              return null
            }
            return r
          })
        }
      },
    )
    return stop
  }, [running])

  // Keep the screen on and tick the clock while riding.
  useEffect(() => {
    if (!running) return
    let release: (() => void) | undefined
    const lock = () => keepScreenOn().then((r) => (release = r))
    lock()
    const onVisible = () => document.visibilityState === 'visible' && lock()
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      release?.()
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [running])

  const start = useCallback(() => {
    setError(null)
    setGps(null)
    distRef.current = initialDistanceState
    update({ bikeId, startedAt: new Date().toISOString(), endedAt: null, distanceM: 0, maxSpeedMs: 0 })
  }, [bikeId, update])

  const stop = useCallback(() => {
    setRide((r) => {
      if (!r) return r
      const stopped = { ...r, endedAt: new Date().toISOString() }
      saveActiveRide(stopped)
      return stopped
    })
  }, [])

  const resume = useCallback(() => {
    if (!ride) return
    distRef.current = distanceStateFrom(ride)
    update({ ...ride, endedAt: null })
  }, [ride, update])

  const clear = useCallback(() => {
    distRef.current = initialDistanceState
    setGps(null)
    update(null)
  }, [update])

  let status: RideStatus = 'idle'
  if (ride && !mine) status = 'other_bike'
  else if (mine && ride.endedAt) status = 'stopped'
  else if (running) status = gps ? 'tracking' : 'waiting_gps'

  const endMs = mine && ride.endedAt ? Date.parse(ride.endedAt) : now
  const elapsedS = mine ? Math.max(0, (endMs - Date.parse(ride.startedAt)) / 1000) : 0

  return {
    status,
    ride: mine ? ride : null,
    otherBikeId: ride && !mine ? ride.bikeId : null,
    distanceKm: mine ? ride.distanceM / 1000 : 0,
    maxSpeedKmh: mine ? ride.maxSpeedMs * 3.6 : 0,
    elapsedS,
    gps,
    error,
    start,
    stop,
    resume,
    clear,
  }
}
