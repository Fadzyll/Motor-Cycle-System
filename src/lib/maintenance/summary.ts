import { formatDate, formatDaysFromNow, formatKm } from '@/lib/format'
import type { StatusItem } from './status'

/**
 * "1,200 km left · 3 May 2027 (in 45 days)" style summary.
 * When overdue, only the limit(s) that were actually passed are shown.
 */
export function dueSummary(item: StatusItem): string {
  const { kmLeft, daysLeft, dueDate } = item.due
  const kmOver = kmLeft != null && kmLeft <= 0
  const dateOver = daysLeft != null && daysLeft <= 0
  const overdue = kmOver || dateOver

  const parts: string[] = []
  if (kmLeft != null && (!overdue || kmOver)) {
    parts.push(kmLeft > 0 ? `${formatKm(kmLeft)} left` : kmLeft === 0 ? 'due now' : `${formatKm(-kmLeft)} over`)
  }
  if (daysLeft != null && dueDate && (!overdue || dateOver)) {
    parts.push(daysLeft > 0 ? `${formatDate(dueDate)} (${formatDaysFromNow(daysLeft)})` : `was due ${formatDate(dueDate)}`)
  }
  return parts.join(' · ') || 'No interval set'
}
