import { supabase } from '@/lib/supabase'

/**
 * Base URL of our Vercel API.
 * - Web: empty → same origin (`/api/...`).
 * - Android (Capacitor): the page origin is https://localhost, so this MUST be the full Vercel URL.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** fetch() wrapper that targets our API and sends the user's Supabase token. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`)

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error ?? res.statusText)
  }
  return (await res.json()) as T
}
