import { describe, expect, it } from 'vitest'
import type { ScheduleWithType } from '@/lib/data/types'
import { isActiveByDefault } from './defaults'
import { buildBikeStatus, countByStatus } from './status'

const today = new Date(Date.UTC(2026, 10, 4)) // 4 Nov 2026

function schedule(id: string, name: string, km: number | null, days: number | null, active = true): ScheduleWithType {
  return {
    id: `s-${id}`,
    motorcycle_id: 'bike',
    maintenance_type_id: id,
    interval_km: km,
    interval_days: days,
    active,
    maintenance_types: {
      id,
      user_id: null,
      name,
      default_interval_km: km,
      default_interval_days: days,
      icon: null,
      sort_order: 0,
    },
  }
}

const bike = { id: 'bike', current_odometer: 12_900, created_at: '2026-06-01T03:00:00Z' }
const readings = [{ motorcycle_id: 'bike', odometer: 10_000, recorded_at: '2026-06-01T03:00:00Z' }]

describe('buildBikeStatus', () => {
  it('uses the last service when there is one, the baseline otherwise', () => {
    const items = buildBikeStatus({
      bike,
      schedules: [schedule('oil', 'Engine oil', 3000, 180), schedule('coolant', 'Coolant', 20_000, 730)],
      logs: [
        { motorcycle_id: 'bike', maintenance_type_id: 'oil', performed_at: '2026-10-01', odometer: 12_000 },
        { motorcycle_id: 'bike', maintenance_type_id: 'oil', performed_at: '2026-07-01', odometer: 10_500 },
      ],
      readings,
      today,
    })
    const oil = items.find((i) => i.typeId === 'oil')!
    expect(oil.lastService).toEqual({ performedAt: '2026-10-01', odometer: 12_000 })
    expect(oil.due.dueKm).toBe(15_000)

    const coolant = items.find((i) => i.typeId === 'coolant')!
    expect(coolant.lastService).toBeNull()
    expect(coolant.due.dueKm).toBe(30_000) // baseline 10,000 + 20,000
  })

  it('skips inactive items, ignores other bikes and sorts by urgency', () => {
    const items = buildBikeStatus({
      bike,
      schedules: [
        schedule('coolant', 'Coolant', 20_000, 730),
        schedule('oil', 'Engine oil', 3000, null), // 10,000 + 3,000 = 13,000 → 100 km left → due soon
        schedule('belt', 'CVT belt', 1000, null, false),
        { ...schedule('chain', 'Chain', 2000, null), motorcycle_id: 'other-bike' },
      ],
      logs: [{ motorcycle_id: 'other-bike', maintenance_type_id: 'oil', performed_at: '2026-11-01', odometer: 12_900 }],
      readings,
      today,
    })
    expect(items.map((i) => i.typeId)).toEqual(['oil', 'coolant'])
    expect(items[0].due.status).toBe('due_soon')
    expect(countByStatus(items)).toEqual({ overdue: 0, dueSoon: 1, ok: 1 })
  })

  it('ignores back-dated readings for the never-serviced baseline', () => {
    const [coolant] = buildBikeStatus({
      bike,
      schedules: [schedule('coolant', 'Coolant', 20_000, 730)],
      logs: [],
      readings: [...readings, { motorcycle_id: 'bike', odometer: 2_000, recorded_at: '2025-01-01T12:00:00Z' }],
      today,
    })
    expect(coolant.due.dueKm).toBe(30_000)
    expect(coolant.due.dueDate?.toISOString().slice(0, 10)).toBe('2028-05-31')
  })

  it('falls back to the bike creation date without readings', () => {
    const [item] = buildBikeStatus({ bike, schedules: [schedule('fluid', 'Brake fluid', null, 730)], logs: [], readings: [], today })
    expect(item.due.dueDate?.toISOString().slice(0, 10)).toBe('2028-05-31')
  })
})

describe('isActiveByDefault', () => {
  it('switches chain items off and the CVT belt on for scooters', () => {
    expect(isActiveByDefault({ name: 'Chain clean & lube' }, true)).toBe(false)
    expect(isActiveByDefault({ name: 'Chain clean & lube' }, false)).toBe(true)
    expect(isActiveByDefault({ name: 'CVT belt (scooters)' }, true)).toBe(true)
    expect(isActiveByDefault({ name: 'CVT belt (scooters)' }, false)).toBe(false)
    expect(isActiveByDefault({ name: 'Engine oil' }, true)).toBe(true)
  })
})
