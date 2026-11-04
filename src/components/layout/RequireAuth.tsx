import { Navigate, Outlet, useLocation } from 'react-router'
import { wasSignedOutByUser } from '@/lib/auth/actions'
import { useAuth } from '@/lib/auth/context'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="grid min-h-full place-items-center text-muted">Loading…</div>
  }
  if (!session) {
    return <Navigate to="/login" replace state={wasSignedOutByUser() ? null : { from: location.pathname }} />
  }
  return <Outlet />
}
