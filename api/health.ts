import { json, preflight } from './_lib/cors.js'

/** GET /api/health — lets the web and Android app check they can reach the API. */
export function GET(request: Request): Response {
  return json(request, { ok: true, time: new Date().toISOString() })
}

export function OPTIONS(request: Request): Response {
  return preflight(request)
}
