import type { ServiceInput } from '@/lib/data/api'
import { localToday, toDateInputValue } from '@/lib/dates'

export interface ServiceFormValues {
  performedAt: string
  odometer: string
  /** typeId → cost text ('' = no cost) for every ticked item. */
  items: Record<string, string>
  workshopName: string
  notes: string
}

export type ServiceFormErrors = Partial<Record<'performedAt' | 'odometer' | 'items' | 'cost', string>>

export function parseCost(value: string): number | null | undefined {
  const v = value.trim().replace(',', '.')
  if (v === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return undefined // invalid
  return Number(v)
}

export function validateService(
  values: ServiceFormValues,
  today: Date = localToday(),
): { ok: true; input: ServiceInput } | { ok: false; errors: ServiceFormErrors } {
  const errors: ServiceFormErrors = {}

  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.performedAt)) errors.performedAt = 'Pick the service date'
  else if (values.performedAt > toDateInputValue(today)) errors.performedAt = 'The date cannot be in the future'

  // Optional: empty when the meter is broken.
  const odoText = values.odometer.trim()
  const odometer = odoText === '' ? null : Number(odoText)
  if (odometer != null && (!Number.isInteger(odometer) || odometer < 0)) errors.odometer = 'Enter the odometer in whole km'

  const entries = Object.entries(values.items)
  if (entries.length === 0) errors.items = 'Tick at least one item you had done'

  const items: ServiceInput['items'] = []
  for (const [typeId, costText] of entries) {
    const cost = parseCost(costText)
    if (cost === undefined) errors.cost = 'Costs must be numbers like 45 or 45.50'
    else items.push({ typeId, cost })
  }

  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    input: {
      performedAt: values.performedAt,
      odometer,
      items,
      workshopName: values.workshopName.trim() || null,
      notes: values.notes.trim() || null,
    },
  }
}
