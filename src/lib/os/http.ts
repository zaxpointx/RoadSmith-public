import { NextResponse } from 'next/server'
import { getSession, type StaffSession } from './auth.ts'
import { OsError } from './util.ts'

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status)
}

/** Reject cross-site state changes (defence in depth on top of SameSite cookies). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === (req.headers.get('x-forwarded-host') ?? req.headers.get('host'))
  } catch {
    return false
  }
}

export async function withSession(req: Request, fn: (s: StaffSession) => Promise<Response>): Promise<Response> {
  if (req.method !== 'GET' && !sameOrigin(req)) return fail('Cross-site request blocked.', 403)
  const s = await getSession()
  if (!s) return fail('Sign in to the Control Center first.', 401)
  try {
    return await fn(s)
  } catch (err) {
    if (err instanceof OsError) return fail(err.message, err.code === 'not_found' ? 404 : err.code === 'forbidden' ? 403 : 409)
    console.error('[roadsmith] request failed', err)
    return fail('Something went wrong; nothing was changed.', 500)
  }
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    return {} as T
  }
}
