import { describe, expect, it } from 'vitest'
import type { MaintenanceLog } from '@/lib/data/types'
import { groupIntoVisits, totalSpent } from './history'

function log(id: string, date: string, odo: number, cost: number | null, workshop: string | null = 'A'): MaintenanceLog {
  return {
    id,
    motorcycle_id: 'b',
    maintenance_type_id: id,
    performed_at: date,
    odometer: odo,
    cost,
    workshop_name: workshop,
    google_place_id: null,
    notes: null,
    receipt_url: null,
    created_at: '',
  }
}

describe('groupIntoVisits', () => {
  it('groups by date, odometer and workshop and sums costs', () => {
    const visits = groupIntoVisits([
      log('oil', '2026-10-01', 12_000, 45),
      log('filter', '2026-10-01', 12_000, 15),
      log('chain', '2026-10-01', 12_000, null, null),
      log('tyre', '2026-11-01', 13_000, null),
    ])
    expect(visits.map((v) => [v.performedAt, v.logs.length, v.total])).toEqual([
      ['2026-11-01', 1, null],
      ['2026-10-01', 2, 60],
      ['2026-10-01', 1, null],
    ])
  })

  it('totals all costs (numeric strings from Postgres too)', () => {
    expect(totalSpent([log('a', '2026-01-01', 1, 10.5), { ...log('b', '2026-01-01', 1, null), cost: '4.50' as unknown as number }])).toBe(15)
  })
})
