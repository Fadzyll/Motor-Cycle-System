import { AlertTriangle, Loader2 } from 'lucide-react'
import { Card } from './card'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      {label}
    </div>
  )
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <Card className="flex items-start gap-3 border-danger/40 text-sm">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
      <div>
        <p className="font-medium">Something went wrong</p>
        <p className="mt-1 text-muted">{error instanceof Error ? error.message : String(error)}</p>
      </div>
    </Card>
  )
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <p role="alert" className="text-sm text-danger">
      {error instanceof Error ? error.message : String(error)}
    </p>
  )
}
