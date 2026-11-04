/**
 * Light / dark theme preference.
 * - 'system' follows the phone/browser setting (no data-theme attribute).
 * - 'light' / 'dark' are stored in localStorage and set data-theme on <html>.
 * index.html applies the stored value before first paint.
 */

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const STORAGE_KEY = 'theme'
const META_COLORS: Record<ResolvedTheme, string> = { light: '#f6f7f9', dark: '#0b0f14' }

const darkQuery = () =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function resolveTheme(pref: ThemePreference, systemDark = darkQuery()?.matches ?? false): ResolvedTheme {
  if (pref === 'system') return systemDark ? 'dark' : 'light'
  return pref
}

/** Applies the preference to the page (attribute + browser/Android status bar colour). */
export function applyPreference(pref: ThemePreference) {
  const root = document.documentElement
  // Switch instantly: without this, every button fades between colours for a moment.
  const noTransitions = document.createElement('style')
  noTransitions.textContent = '*,*::before,*::after{transition:none!important}'
  document.head.appendChild(noTransitions)

  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[resolveTheme(pref)])

  void getComputedStyle(root).color // apply the new colours while transitions are off
  setTimeout(() => noTransitions.remove(), 0)
}

// ---- tiny store so every component using the theme stays in sync ----

type Listener = () => void
const listeners = new Set<Listener>()
let current: ThemePreference | null = null

export function getPreference(): ThemePreference {
  if (current == null) current = readPreference()
  return current
}

export function setPreference(pref: ThemePreference) {
  current = pref
  try {
    if (pref === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // storage blocked (private mode): the choice still applies until reload
  }
  applyPreference(pref)
  listeners.forEach((l) => l())
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  // The resolved theme also changes when the phone switches light/dark in "System" mode.
  const mq = darkQuery()
  const onSystemChange = () => {
    if (getPreference() === 'system') applyPreference('system')
    listener()
  }
  mq?.addEventListener('change', onSystemChange)
  return () => {
    listeners.delete(listener)
    mq?.removeEventListener('change', onSystemChange)
  }
}
