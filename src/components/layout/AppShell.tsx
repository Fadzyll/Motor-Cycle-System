import { Bike, LayoutDashboard, MapPin, Settings } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { ThemeToggleButton } from '@/components/theme/ThemeToggleButton'
import { registerBackButton } from '@/native/backButton'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bikes', label: 'Bikes', icon: Bike },
  { to: '/workshops', label: 'Workshops', icon: MapPin },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const rootPaths = new Set(tabs.map((t) => t.to))

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(
    () =>
      registerBackButton(
        () => navigate(-1),
        () => !rootPaths.has(location.pathname) && window.history.length > 1,
      ),
    [navigate, location.pathname],
  )

  return (
    <div className="flex min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Bike className="h-6 w-6 text-primary" aria-hidden />
          <span className="flex-1 font-semibold">Motorcycle System</span>
          <ThemeToggleButton className="-mr-2" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-24">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface"
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
