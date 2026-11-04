import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import type { ThemePreference } from '@/lib/theme/theme'
import { useTheme } from '@/lib/theme/useTheme'
import { cn } from '@/lib/utils'

const options: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

/** System / Light / Dark segmented control for Settings. */
export function ThemeSelector() {
  const { preference, setPreference } = useTheme()
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-bg p-1">
      {options.map(({ value, label, icon: Icon }) => {
        const selected = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(value)}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors',
              selected ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
