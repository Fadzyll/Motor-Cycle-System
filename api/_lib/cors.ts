/**
 * CORS for our Vercel Functions.
 * The Android app (Capacitor) runs on https://localhost, so it is a different origin
 * from the Vercel site and must be allowed explicitly.
 */
const BUILT_IN_ORIGINS = [
  'https://localhost', // Capacitor Android
  'capacitor://localhost', // Capacitor iOS (future)
  'http://localhost:5173', // Vite dev server
]

function allowedOrigins(): string[] {
  const extra = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const vercel = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`)
  return [...BUILT_IN_ORIGINS, ...vercel, ...extra]
}

export function isAllowedOrigin(origin: string | null): boolean {
  return origin != null && allowedOrigins().includes(origin)
}

export function corsHeaders(request: Request): Headers {
  const headers = new Headers({ Vary: 'Origin' })
  const origin = request.headers.get('origin')
  if (isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin!)
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept')
    headers.set('Access-Control-Max-Age', '86400')
  }
  return headers
}

/** Reply to the browser's CORS preflight request. */
export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) })
}

export function json(request: Request, body: unknown, init: ResponseInit = {}): Response {
  const headers = corsHeaders(request)
  headers.set('Content-Type', 'application/json')
  new Headers(init.headers).forEach((v, k) => headers.set(k, v))
  return new Response(JSON.stringify(body), { ...init, headers })
}
