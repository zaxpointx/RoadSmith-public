import { NextResponse } from 'next/server'
import { ready } from '@/lib/os/sandbox'
import { SESSION_COOKIE, sandboxOwnerId, sessionCookieOptions, signSession } from '@/lib/os/auth'
import { sandboxEnabled } from '@/lib/os/sandbox-api'
import { isSandbox } from '@/lib/os/db'
import { fail, sameOrigin } from '@/lib/os/http'

export const dynamic = 'force-dynamic'

/** Sandbox sign-in as the demo owner. Not available against a real database. */
export async function POST(req: Request) {
  if (!sandboxEnabled() || !isSandbox()) return fail('Use your email sign-in link.', 404)
  if (!sameOrigin(req)) return fail('Cross-site request blocked.', 403)
  const db = await ready()
  const id = await sandboxOwnerId(db)
  if (!id) return fail('Sandbox owner not found; reset the sandbox.', 500)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, await signSession(db, id), sessionCookieOptions)
  return res
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail('Cross-site request blocked.', 403)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
  return res
}
