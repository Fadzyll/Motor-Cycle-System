import { describe, expect, it } from 'vitest'
import { corsHeaders, isAllowedOrigin } from './cors'

describe('cors', () => {
  it('allows the Capacitor Android origin and dev server', () => {
    expect(isAllowedOrigin('https://localhost')).toBe(true)
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true)
  })

  it('rejects unknown origins', () => {
    expect(isAllowedOrigin('https://evil.example')).toBe(false)
    expect(isAllowedOrigin(null)).toBe(false)
    const h = corsHeaders(new Request('https://x.test', { headers: { origin: 'https://evil.example' } }))
    expect(h.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('echoes an allowed origin', () => {
    const h = corsHeaders(new Request('https://x.test', { headers: { origin: 'https://localhost' } }))
    expect(h.get('Access-Control-Allow-Origin')).toBe('https://localhost')
  })
})
