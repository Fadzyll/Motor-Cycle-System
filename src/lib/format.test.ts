import { describe, expect, it } from 'vitest'
import { formatDaysFromNow, formatDuration, formatInterval, formatKm, formatRideKm } from './format'

describe('format', () => {
  it('formats relative days compactly', () => {
    expect(formatDaysFromNow(0)).toBe('today')
    expect(formatDaysFromNow(14)).toBe('in 14 days')
    expect(formatDaysFromNow(180)).toBe('in 6 months')
    expect(formatDaysFromNow(365)).toBe('in 12 months')
    expect(formatDaysFromNow(1095)).toBe('in 3 years')
    expect(formatDaysFromNow(-3)).toBe('3 days ago')
  })

  it('formats km and intervals', () => {
    expect(formatKm(15230)).toBe('15,230 km')
    expect(formatInterval(3000, 180)).toBe('Every 3,000 km or 6 mo')
    expect(formatInterval(null, 730)).toBe('Every 2 yr')
    expect(formatInterval(null, null)).toBe('No interval set')
  })

  it('formats ride distance and time', () => {
    expect(formatRideKm(0.348)).toBe('0.35 km')
    expect(formatRideKm(12.44)).toBe('12.4 km')
    expect(formatDuration(245)).toBe('4:05')
    expect(formatDuration(3729)).toBe('1:02:09')
  })
})
