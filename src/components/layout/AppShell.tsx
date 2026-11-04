import { Bike, LayoutDashboard, MapPin, Settings } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { ThemeToggleButton } from '@/components/theme/ThemeToggleButton'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import { registerBackButton } from '@/native/backButton'

const tabs = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bikes', label: 'Bikes', icon: Bike },
  { to: '/workshops', label: 'Workshops', icon: MapPin },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const rootPaths = new Set(tabs.map((t) => t.to))

/**
 * Layout:
 * - Phones / small screens (< 1024px): top bar + bottom tab bar.
 * - Laptops / desktops (≥ 1024px, Tailwind `lg:`): left sidebar, wider content.
 */
export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  useEffect(
    () =>
      registerBackButton(
        () => navigate(-1),
        () => !rootPaths.has(location.pathname) && window.history.length > 1,
      ),
    [navigate, location.pathname],
  )

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      {/* ── Desktop sidebar ── */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <Bike className="h-7 w-7 text-primary" aria-hidden />
          <span className="text-lg font-semibold">Motorcycle System</span>
        </div>
        <nav aria-label="Main" className="flex-1 px-3 py-2">
          <ul className="space-y-1">
            {tabs.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-bg hover:text-fg',
                    )
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-xs text-muted" title={user?.email ?? undefined}>
            {user?.email}
          </p>
          <ThemeToggleButton />
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="safe-top sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Bike className="h-6 w-6 text-primary" aria-hidden />
          <span className="flex-1 font-semibold">Motorcycle System</span>
          <ThemeToggleButton className="-mr-2" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-24 lg:max-w-6xl lg:px-10 lg:py-10">
        <Outlet />
      </main>

      {/* ── Mobile bottom tabs ── */}
      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface lg:hidden"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-xs',
                    isActive ? 'text-primary' : 'text-muted',
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
