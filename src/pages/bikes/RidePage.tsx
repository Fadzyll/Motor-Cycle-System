import { AlertTriangle, MapPin, Navigation, Satellite, Square } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState, FormError, LoadingState } from '@/components/ui/feedback'
import { useBike, useRides, useSaveRide } from '@/lib/data/hooks'
import type { Motorcycle } from '@/lib/data/types'
import { formatDate, formatDuration, formatKm, formatRideKm } from '@/lib/format'
import { useRideTracker } from '@/lib/rides/useRideTracker'
import { cn } from '@/lib/utils'

/** Rides shorter than this aren't worth saving (GPS noise, a test tap). */
const MIN_SAVE_KM = 0.05

export function RidePage() {
  const { bikeId = '' } = useParams()
  const bike = useBike(bikeId)
  if (bike.isPending) return <LoadingState />
  if (bike.error) return <ErrorState error={bike.error} />
  if (!bike.data) return <ErrorState error="Motorcycle not found" />
  return <RideTracker bike={bike.data} />
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="text-center">
      <p className={cn('font-bold tabular-nums', big ? 'text-5xl lg:text-6xl' : 'text-2xl')}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted">{label}</p>
    </div>
  )
}

function RideTracker({ bike }: { bike: Motorcycle }) {
  const navigate = useNavigate()
  const t = useRideTracker(bike.id)
  const save = useSaveRide()
  const rides = useRides(bike.id)

  const odoAfter = (bike.current_odometer ?? 0) + Math.round(t.distanceKm)

  function onSave() {
    if (!t.ride?.endedAt) return
    save.mutate(
      {
        bike,
        ride: {
          startedAt: t.ride.startedAt,
          endedAt: t.ride.endedAt,
          distanceKm: t.distanceKm,
          durationS: t.elapsedS,
          maxSpeedKmh: t.maxSpeedKmh || null,
        },
      },
      {
        onSuccess: () => {
          t.clear()
          navigate(`/bikes/${bike.id}`)
        },
      },
    )
  }

  const riding = t.status === 'tracking' || t.status === 'waiting_gps'

  return (
    <div className="max-w-2xl">
      <PageHeader title="Ride" subtitle={bike.nickname} backTo={`/bikes/${bike.id}`} />

      {t.status === 'other_bike' && (
        <Card className="mb-4 flex items-start gap-3 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
          <p>
            A ride is already running for another bike.{' '}
            <Link to={`/bikes/${t.otherBikeId}/ride`} className="font-medium text-primary underline">
              Open that ride
            </Link>{' '}
            to stop it first.
          </p>
        </Card>
      )}

      {t.status === 'idle' && (
        <Card className="space-y-4">
          <div className="flex items-start gap-3">
            <Navigation className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
            <div className="space-y-2 text-sm">
              <p className="font-medium">Measure your ride with GPS</p>
              <p className="text-muted">
                The distance is added to your odometer when you save, so the service bars fill up as you ride.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-muted">
                <li>Keep this screen open while riding (the app keeps it awake).</li>
                <li>Your location is only used on your phone to measure distance — the route is not saved.</li>
              </ul>
              {bike.current_odometer == null && (
                <p className="rounded-lg bg-warn/10 p-2 text-warn">
                  Your odometer isn't set, so the app will count km from 0 starting with this ride.
                </p>
              )}
            </div>
          </div>
          <Button size="lg" className="w-full" onClick={t.start}>
            <Navigation className="h-5 w-5" aria-hidden /> Start ride
          </Button>
        </Card>
      )}

      {(riding || t.status === 'stopped') && (
        <Card className="space-y-6 py-8">
          <Stat label="Distance" value={formatRideKm(t.distanceKm)} big />
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Time" value={formatDuration(t.elapsedS)} />
            <Stat
              label="Speed"
              value={riding && t.gps?.speedKmh != null ? `${Math.round(t.gps.speedKmh)}` : '–'}
            />
            <Stat label="Top km/h" value={t.maxSpeedKmh ? `${Math.round(t.maxSpeedKmh)}` : '–'} />
          </div>

          {riding && (
            <p
              className={cn(
                'flex items-center justify-center gap-2 text-sm',
                t.status === 'tracking' && t.gps && t.gps.accuracy <= 50 ? 'text-ok' : 'text-warn',
              )}
              role="status"
            >
              <Satellite className="h-4 w-4" aria-hidden />
              {t.status === 'waiting_gps'
                ? 'Waiting for GPS…'
                : t.gps!.accuracy <= 50
                  ? `GPS good (±${Math.round(t.gps!.accuracy)} m)`
                  : `Weak GPS (±${Math.round(t.gps!.accuracy)} m) — not counting`}
            </p>
          )}

          {riding && (
            <Button size="lg" variant="danger" className="w-full" onClick={t.stop}>
              <Square className="h-5 w-5" aria-hidden /> Stop ride
            </Button>
          )}

          {t.status === 'stopped' && (
            <div className="space-y-3">
              {t.distanceKm >= MIN_SAVE_KM ? (
                <p className="text-center text-sm text-muted">
                  Saving adds <strong className="text-fg">{Math.round(t.distanceKm)} km</strong> — odometer{' '}
                  {bike.current_odometer == null ? 'starts at 0 km →' : `${formatKm(bike.current_odometer)} →`}{' '}
                  <strong className="text-fg">{formatKm(odoAfter)}</strong>
                </p>
              ) : (
                <p className="text-center text-sm text-muted">This ride is too short to save.</p>
              )}
              <FormError error={save.error} />
              {t.distanceKm >= MIN_SAVE_KM && (
                <Button size="lg" className="w-full" onClick={onSave} disabled={save.isPending}>
                  {save.isPending ? 'Saving…' : 'Save ride'}
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={t.resume}>
                  Continue riding
                </Button>
                <Button variant="ghost" className="text-danger" onClick={t.clear}>
                  Discard
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {t.error && (
        <Card className="mt-4 flex items-start gap-3 text-sm">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
          <p>{t.error}</p>
        </Card>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Recent rides</h2>
        {rides.data?.length ? (
          <Card className="divide-y divide-border p-0">
            {rides.data.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{formatRideKm(Number(r.distance_km))}</p>
                  <p className="text-xs text-muted">
                    {formatDate(r.started_at.slice(0, 10))} · {formatDuration(r.duration_s)}
                  </p>
                </div>
                {r.max_speed_kmh != null && (
                  <span className="text-xs text-muted">top {Math.round(Number(r.max_speed_kmh))} km/h</span>
                )}
              </div>
            ))}
          </Card>
        ) : (
          <Card className="text-sm text-muted">No rides yet.</Card>
        )}
      </section>
    </div>
  )
}
