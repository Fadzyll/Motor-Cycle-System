import { Bike } from 'lucide-react'
import type { ReactNode } from 'react'
import { ThemeToggleButton } from '@/components/theme/ThemeToggleButton'
import { Card } from '@/components/ui/card'

/** Centered card used by sign in, register, activate and password reset. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="safe-top relative grid min-h-full place-items-center px-4 py-10">
      <ThemeToggleButton className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3" />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-fg">
            <Bike className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        <Card className="p-5">{children}</Card>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  )
}
