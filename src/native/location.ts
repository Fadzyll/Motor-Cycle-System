import type { Fix } from '@/lib/rides/distance'

/**
 * Watches the device position. Uses the browser Geolocation API, which also
 * works inside the Capacitor Android WebView (the app asks Android for the
 * location permission the first time). Only works while the app is open.
 */
export function watchPosition(
  onFix: (fix: Fix & { speedMs: number | null }) => void,
  onError: (message: string, permissionDenied: boolean) => void,
): () => void {
  if (!('geolocation' in navigator)) {
    onError('This device or browser cannot share its location.', false)
    return () => {}
  }
  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
        speedMs: pos.coords.speed != null && Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
      }),
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        onError(
          'Location is blocked. Allow location for this app in your browser or phone settings, then try again.',
          true,
        )
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        onError('No GPS signal. Make sure location is turned on and you are outdoors.', false)
      }
      // TIMEOUT: keep watching — the next fix usually arrives
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
  )
  return () => navigator.geolocation.clearWatch(id)
}

/** Keeps the screen on during a ride (tracking stops when the screen locks). */
export async function keepScreenOn(): Promise<() => void> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }
    const lock = await nav.wakeLock?.request('screen')
    return () => void lock?.release().catch(() => {})
  } catch {
    return () => {}
  }
}
