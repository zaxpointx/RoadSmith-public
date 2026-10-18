// ROA-98: shared signed-request gate for cron / job runner endpoints.
// The /api/reminders route and the future /api/agent/jobs/run handler both
// require the same `CRON_SECRET` bearer token. Centralising the check here
// keeps the policy in one place and makes it testable without Next.js.

import { timingSafeEqual } from 'node:crypto'

export interface SignedRequestCheck {
  ok: boolean
  reason?: 'missing_secret' | 'short_secret' | 'no_header' | 'malformed_header' | 'mismatch'
}

export function isSignedCronRequest(request: Request): SignedRequestCheck {
  const expected = process.env.CRON_SECRET
  if (!expected) return { ok: false, reason: 'missing_secret' }
  if (expected.length < 16) return { ok: false, reason: 'short_secret' }

  const header = request.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!match) return { ok: false, reason: 'no_header' }

  const provided = match[1]
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return { ok: false, reason: 'mismatch' }

  try {
    if (!timingSafeEqual(a, b)) return { ok: false, reason: 'mismatch' }
  } catch {
    return { ok: false, reason: 'malformed_header' }
  }

  return { ok: true }
}
