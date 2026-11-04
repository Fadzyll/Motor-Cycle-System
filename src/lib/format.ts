const LOCALE = 'en-MY'

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString(LOCALE)} km`
}

/** Odometer for display; null means the meter is broken / not set. */
export function formatOdometer(km: number | null): string {
  return km == null ? 'Odometer not set' : formatKm(km)
}

/** Formats a midnight-UTC calendar date. */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date.length === 10 ? `${date}T00:00:00Z` : date) : date
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d)
}

export function formatMoney(amount: number, currency = 'MYR'): string {
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

/** "in 3 days", "today", "5 days ago". */
export function formatDaysFromNow(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  const abs = Math.abs(days)
  const span =
    abs >= 730 ? `${Math.round(abs / 365)} years` : abs >= 60 ? `${Math.round(abs / 30.4)} months` : `${abs} days`
  return days > 0 ? `in ${span}` : `${span} ago`
}

export function formatInterval(km: number | null, days: number | null): string {
  const parts: string[] = []
  if (km) parts.push(formatKm(km))
  if (days) {
    if (days % 365 === 0) parts.push(`${days / 365} yr`)
    else if (days % 30 === 0) parts.push(`${days / 30} mo`)
    else if (days % 7 === 0) parts.push(`${days / 7} wk`)
    else parts.push(`${days} days`)
  }
  return parts.length ? `Every ${parts.join(' or ')}` : 'No interval set'
}

/** "Yamaha · Y15ZR · 2021 · WXY 1234" */
export function bikeSubtitle(bike: {
  make: string | null
  model: string | null
  year: number | null
  plate_number: string | null
}): string {
  return [bike.make, bike.model, bike.year, bike.plate_number].filter(Boolean).join(' · ')
}

/** Ride distance: "0.35 km", "12.4 km". */
export function formatRideKm(km: number): string {
  return `${km < 10 ? km.toFixed(2) : km.toFixed(1)} km`
}

/** Ride time: "4:05", "1:02:09". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds % 60)
  const m = Math.floor((totalSeconds / 60) % 60)
  const h = Math.floor(totalSeconds / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
