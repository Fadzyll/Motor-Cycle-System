import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function PageHeader({
  title,
  subtitle,
  action,
  backTo,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  backTo?: string
}) {
  return (
    <div className="mb-5">
      {backTo && (
        <Link to={backTo} className="-ml-1 mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}
