import { describe, expect, it } from 'vitest'
import { addKm, serviceOdometer } from './odometer'

describe('serviceOdometer', () => {
  it('uses the reading as is', () => {
    expect(serviceOdometer('reading', 15_300, 15_500)).toEqual({ ok: true, odometer: 15_300 })
  })

  it('works back from km ridden since the service', () => {
    // meter now 90 km, ridden 90 km since the oil change → it was at 0
    expect(serviceOdometer('since', 90, 90)).toEqual({ ok: true, odometer: 0 })
    expect(serviceOdometer('since', 200, 15_500)).toEqual({ ok: true, odometer: 15_300 })
  })

  it('allows leaving km empty', () => {
    expect(serviceOdometer('since', null, 90)).toEqual({ ok: true, odometer: null })
  })

  it('rejects impossible values', () => {
    expect(serviceOdometer('since', 100, 90).ok).toBe(false)
    expect(serviceOdometer('since', 10, null).ok).toBe(false)
    expect(serviceOdometer('reading', -1, 90).ok).toBe(false)
    expect(serviceOdometer('reading', 1.5, 90).ok).toBe(false)
  })
})

describe('addKm', () => {
  it('adds to the current odometer, or starts from 0', () => {
    expect(addKm(90, 25)).toBe(115)
    expect(addKm(null, 25)).toBe(25)
  })
})
