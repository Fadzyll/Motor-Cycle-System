import { describe, expect, it } from 'vitest'
import { compareByUrgency, computeDue, estimateKmPerDay } from './due'

const today = new Date('2026-11-04T10:00:00Z')

describe('computeDue', () => {
  const oil = { intervalKm: 3000, intervalDays: 180, lastOdometer: 10_000, lastDate: '2026-09-01' }

  it('is ok when far from both limits', () => {
    const r = computeDue({ ...oil, currentOdometer: 11_000, today })
    expect(r.status).toBe('ok')
    expect(r.dueKm).toBe(13_000)
    expect(r.kmLeft).toBe(2000)
    expect(r.dueDate?.toISOString().slice(0, 10)).toBe('2027-02-28')
    expect(r.daysLeft).toBe(116)
  })

  it('is overdue when the km limit is passed', () => {
    expect(computeDue({ ...oil, currentOdometer: 13_050, today }).status).toBe('overdue')
  })

  it('is overdue when the time limit is passed even with low km', () => {
    const r = computeDue({ ...oil, lastDate: '2026-01-01', currentOdometer: 10_100, today })
    expect(r.status).toBe('overdue')
    expect(r.daysLeft).toBeLessThan(0)
  })

  it('is due soon within 10% of the km interval', () => {
    expect(computeDue({ ...oil, currentOdometer: 12_750, today }).status).toBe('due_soon')
  })

  it('is due soon within 14 days of the date', () => {
    const r = computeDue({ ...oil, lastDate: '2026-05-15', currentOdometer: 10_500, today })
    expect(r.daysLeft).toBe(7)
    expect(r.status).toBe('due_soon')
  })

  it('shrinks the due-soon window for short intervals', () => {
    const pressure = { intervalKm: null, intervalDays: 14, lastOdometer: 0, currentOdometer: 0, today }
    expect(computeDue({ ...pressure, lastDate: '2026-11-04' }).status).toBe('ok') // 14 days left
    expect(computeDue({ ...pressure, lastDate: '2026-10-25' }).status).toBe('due_soon') // 4 days left
  })

  it('uses km per day to predict an earlier due date', () => {
    // 1,000 km left at 100 km/day = 10 days, sooner than the 116-day time limit.
    const r = computeDue({ ...oil, currentOdometer: 12_000, kmPerDay: 100, today })
    expect(r.estimatedDaysLeft).toBe(10)
    expect(r.status).toBe('due_soon')
  })

  it('handles distance-only and time-only items', () => {
    const chainSet = computeDue({ ...oil, intervalDays: null, intervalKm: 20_000, currentOdometer: 11_000, today })
    expect(chainSet.dueDate).toBeNull()
    expect(chainSet.status).toBe('ok')

    const brakeFluid = computeDue({ ...oil, intervalKm: null, intervalDays: 730, currentOdometer: 50_000, today })
    expect(brakeFluid.kmLeft).toBeNull()
    expect(brakeFluid.status).toBe('ok')
  })

  it('is unknown without any interval', () => {
    expect(computeDue({ ...oil, intervalKm: null, intervalDays: null, currentOdometer: 0, today }).status).toBe('unknown')
  })
})

describe('estimateKmPerDay', () => {
  it('averages distance over the reading window', () => {
    const readings = [
      { odometer: 10_000, recordedAt: '2026-10-05T00:00:00Z' },
      { odometer: 10_600, recordedAt: '2026-10-20T00:00:00Z' },
      { odometer: 11_200, recordedAt: '2026-11-04T00:00:00Z' },
    ]
    expect(estimateKmPerDay(readings, { today })).toBeCloseTo(40)
  })

  it('ignores readings older than the window', () => {
    const readings = [
      { odometer: 1_000, recordedAt: '2025-01-01T00:00:00Z' },
      { odometer: 11_000, recordedAt: '2026-11-01T00:00:00Z' },
    ]
    expect(estimateKmPerDay(readings, { today })).toBeNull()
  })

  it('returns null with too little data', () => {
    expect(estimateKmPerDay([], { today })).toBeNull()
    expect(estimateKmPerDay([{ odometer: 5, recordedAt: today }], { today })).toBeNull()
  })
})

describe('compareByUrgency', () => {
  it('orders overdue, due soon, ok, unknown', () => {
    const base = { intervalKm: 1000, intervalDays: null, lastOdometer: 0, lastDate: today, today }
    const ok = computeDue({ ...base, currentOdometer: 100 })
    const soon = computeDue({ ...base, currentOdometer: 950 })
    const late = computeDue({ ...base, currentOdometer: 1200 })
    const unknown = computeDue({ ...base, intervalKm: null, currentOdometer: 0 })
    const sorted = [ok, unknown, soon, late].sort(compareByUrgency).map((r) => r.status)
    expect(sorted).toEqual(['overdue', 'due_soon', 'ok', 'unknown'])
  })
})
