import { afterEach, describe, expect, it } from 'vitest'
import { applyPreference, getPreference, readPreference, resolveTheme, setPreference, STORAGE_KEY } from './theme'

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('theme', () => {
  it('resolves system preference from the device setting', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('reads only valid stored values', () => {
    expect(readPreference()).toBe('system')
    localStorage.setItem(STORAGE_KEY, 'dark')
    expect(readPreference()).toBe('dark')
    localStorage.setItem(STORAGE_KEY, 'purple')
    expect(readPreference()).toBe('system')
  })

  it('stores the choice and sets data-theme on <html>', () => {
    setPreference('dark')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(getPreference()).toBe('dark')

    setPreference('system')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('updates the theme-color meta tag', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
    applyPreference('dark')
    expect(meta.content).toBe('#0b0f14')
    applyPreference('light')
    expect(meta.content).toBe('#f6f7f9')
    meta.remove()
  })
})
