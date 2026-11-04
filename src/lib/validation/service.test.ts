import { describe, expect, it } from 'vitest'
import { parseCost, validateService, type ServiceFormValues } from './service'

const today = new Date(Date.UTC(2026, 10, 4))
const base: ServiceFormValues = {
  performedAt: '2026-11-04',
  odometer: '15230',
  kmMode: 'reading',
  items: { oil: '45', filter: '' },
  workshopName: '  Bengkel Ali ',
  notes: '',
}

describe('validateService', () => {
  it('builds the service input', () => {
    const r = validateService(base, today)
    expect(r).toEqual({
      ok: true,
      input: {
        performedAt: '2026-11-04',
        odometer: 15230,
        items: [
          { typeId: 'oil', cost: 45 },
          { typeId: 'filter', cost: null },
        ],
        workshopName: 'Bengkel Ali',
        notes: null,
      },
    })
  })

  it('reports every problem', () => {
    const r = validateService({ ...base, performedAt: '2026-11-05', odometer: 'abc', items: {} }, today)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['items', 'odometer', 'performedAt'])
  })

  it('works out the odometer from km ridden since the service', () => {
    const r = validateService({ ...base, kmMode: 'since', odometer: '90' }, today, 90)
    expect(r.ok && r.input.odometer).toBe(0)
    const tooFar = validateService({ ...base, kmMode: 'since', odometer: '120' }, today, 90)
    expect(tooFar.ok).toBe(false)
  })

  it('allows an empty odometer', () => {
    const r = validateService({ ...base, odometer: '' }, today)
    expect(r.ok && r.input.odometer).toBeNull()
  })

  it('rejects bad costs', () => {
    const r = validateService({ ...base, items: { oil: '4.555' } }, today)
    expect(r.ok).toBe(false)
  })
})

describe('parseCost', () => {
  it('accepts blank, whole and decimal amounts', () => {
    expect(parseCost('')).toBeNull()
    expect(parseCost('45')).toBe(45)
    expect(parseCost('45,5')).toBe(45.5)
    expect(parseCost('-1')).toBeUndefined()
  })
})
