import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme/useTheme'
import { cn } from '@/lib/utils'

/** One-tap light/dark switch for the top bar. */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme()
  const toDark = resolved === 'light'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={toDark ? 'Switch to dark mode' : 'Switch to light mode'}
      title={toDark ? 'Dark mode' : 'Light mode'}
      className={cn(
        'grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-bg hover:text-fg focus-visible:outline-2 focus-visible:outline-primary',
        className,
      )}
    >
      {toDark ? <Moon className="h-5 w-5" aria-hidden /> : <Sun className="h-5 w-5" aria-hidden />}
    </button>
  )
}
