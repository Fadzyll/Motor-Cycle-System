import { describe, expect, it } from 'vitest'
import { computeDue } from './due'
import type { StatusItem } from './status'
import { dueSummary } from './summary'

const today = new Date(Date.UTC(2026, 10, 4))
const item = (due: ReturnType<typeof computeDue>): StatusItem => ({
  scheduleId: 's', typeId: 't', name: 'Oil', icon: null, intervalKm: null, intervalDays: null, lastService: null, due,
})

describe('dueSummary', () => {
  it('shows both limits when not overdue', () => {
    const due = computeDue({ intervalKm: 3000, intervalDays: 180, lastOdometer: 0, lastDate: '2026-11-04', currentOdometer: 1800, today })
    expect(dueSummary(item(due))).toBe('1,200 km left · 3 May 2027 (in 6 months)')
  })

  it('asks for an odometer reading when km-only and the meter is unknown', () => {
    const due = computeDue({ intervalKm: 20_000, intervalDays: null, lastOdometer: null, lastDate: '2026-11-04', currentOdometer: null, today })
    expect(dueSummary(item(due))).toBe('Needs an odometer reading')
  })

  it('shows only the passed limit when overdue', () => {
    const due = computeDue({ intervalKm: 800, intervalDays: 30, lastOdometer: 0, lastDate: '2026-11-04', currentOdometer: 900, today })
    expect(dueSummary(item(due))).toBe('100 km over')
  })
})
