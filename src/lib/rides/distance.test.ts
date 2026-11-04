import { describe, expect, it } from 'vitest'
import { addFix, haversineM, initialDistanceState, type Fix } from './distance'

// ~0.0009 degrees of latitude ≈ 100 m
const KL = { lat: 3.139, lng: 101.6869 }
const fix = (northM: number, seconds: number, accuracy = 5): Fix => ({
  lat: KL.lat + northM / 111_195,
  lng: KL.lng,
  accuracy,
  timestamp: Date.UTC(2026, 10, 4, 8, 0, 0) + seconds * 1000,
})
const run = (fixes: Fix[]) => fixes.reduce(addFix, initialDistanceState)

describe('haversineM', () => {
  it('measures known distances', () => {
    expect(haversineM(fix(0, 0), fix(1000, 0))).toBeCloseTo(1000, -1)
    // Kuala Lumpur → Petaling Jaya city centres, roughly 10–11 km
    expect(haversineM(KL, { lat: 3.1073, lng: 101.6067 }) / 1000).toBeGreaterThan(9)
  })
})

describe('addFix', () => {
  it('sums a straight ride', () => {
    // 1 km in 100 m steps every 10 s (36 km/h)
    const s = run(Array.from({ length: 11 }, (_, i) => fix(i * 100, i * 10)))
    expect(s.distanceM).toBeCloseTo(1000, -1)
    expect(s.maxSpeedMs * 3.6).toBeCloseTo(36, 0)
  })

  it('ignores jitter while standing still', () => {
    const jitter = [0, 3, -4, 2, 6, -5, 1, 4].map((m, i) => fix(m, i * 5))
    expect(run(jitter).distanceM).toBe(0)
  })

  it('still counts slow riding made of small steps', () => {
    // 5 m every second for 60 s = 300 m (each step below 10 m, but the total adds up)
    const s = run(Array.from({ length: 61 }, (_, i) => fix(i * 5, i)))
    expect(s.distanceM).toBeGreaterThan(280)
    expect(s.distanceM).toBeLessThanOrEqual(301)
  })

  it('ignores inaccurate fixes and impossible jumps', () => {
    const s = run([fix(0, 0), fix(500, 5, 120), fix(5000, 10), fix(100, 20)])
    // 120 m accuracy is ignored; 5 km in 10 s (1,800 km/h) is a glitch; 100 m in 20 s counts
    expect(s.distanceM).toBeCloseTo(100, -1)
  })

  it('ignores out-of-order fixes', () => {
    const s = run([fix(0, 10), fix(100, 5)])
    expect(s.distanceM).toBe(0)
  })
})
