/**
 * Date-only helpers. All "calendar dates" are represented as Date objects at
 * midnight UTC so that day maths is not shifted by the user's time zone
 * (e.g. Malaysia is UTC+8, where 7am local time is still "yesterday" in UTC).
 */

/** Today's local calendar date, as midnight UTC. */
export function localToday(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

/** Local calendar date of a timestamp (e.g. created_at), as midnight UTC. */
export function localDateOf(isoTimestamp: string): Date {
  return localToday(new Date(isoTimestamp))
}

/** Parses 'YYYY-MM-DD' as midnight UTC. */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Formats a midnight-UTC date as 'YYYY-MM-DD' (for <input type="date">). */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}
