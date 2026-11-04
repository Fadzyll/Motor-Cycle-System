import { describe, expect, it } from 'vitest'
import { codeField, errorsByField, loginSchema, registerSchema, resetSchema } from './auth'

describe('auth validation', () => {
  it('accepts a valid registration and normalises the email', () => {
    const r = registerSchema.parse({ name: ' Fadzyll ', email: ' Rider@Example.COM ', password: 'ride2026', confirmPassword: 'ride2026' })
    expect(r).toEqual({ name: 'Fadzyll', email: 'rider@example.com', password: 'ride2026', confirmPassword: 'ride2026' })
  })

  it('reports each registration problem', () => {
    const r = registerSchema.safeParse({ name: '', email: 'nope', password: 'short', confirmPassword: 'other' })
    expect(r.success).toBe(false)
    const errors = errorsByField(r.error!)
    expect(Object.keys(errors).sort()).toEqual(['confirmPassword', 'email', 'name', 'password'])
  })

  it('checks that passwords match', () => {
    const r = registerSchema.safeParse({ name: 'A', email: 'a@b.co', password: 'ride2026', confirmPassword: 'ride2027' })
    expect(errorsByField(r.error!)).toEqual({ confirmPassword: 'Passwords do not match' })
  })

  it('requires letters and a number in passwords', () => {
    expect(registerSchema.safeParse({ name: 'A', email: 'a@b.co', password: 'abcdefgh', confirmPassword: 'abcdefgh' }).success).toBe(false)
    expect(registerSchema.safeParse({ name: 'A', email: 'a@b.co', password: '12345678', confirmPassword: '12345678' }).success).toBe(false)
  })

  it('login only needs an email and any password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
    expect(errorsByField(loginSchema.safeParse({ email: 'a@b.co', password: '' }).error!)).toEqual({ password: 'Enter your password' })
  })

  it('accepts 6–10 digit codes', () => {
    expect(codeField.safeParse('123456').success).toBe(true)
    expect(codeField.safeParse('09711994').success).toBe(true)
    expect(codeField.safeParse('12345').success).toBe(false)
    expect(codeField.safeParse('12ab5678').success).toBe(false)
    expect(resetSchema.safeParse({ code: '12345678', password: 'newpass9', confirmPassword: 'newpass9' }).success).toBe(true)
  })
})
