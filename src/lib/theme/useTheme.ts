import { useSyncExternalStore } from 'react'
import { getPreference, resolveTheme, setPreference, subscribe, type ThemePreference } from './theme'

export function useTheme() {
  const preference = useSyncExternalStore(subscribe, getPreference, () => 'system' as ThemePreference)
  // Re-read on every render: in "System" mode this follows the phone setting.
  const resolved = resolveTheme(preference)
  return {
    preference,
    resolved,
    setPreference,
    /** Flip between light and dark (leaves "System" mode). */
    toggle: () => setPreference(resolved === 'dark' ? 'light' : 'dark'),
  }
}
