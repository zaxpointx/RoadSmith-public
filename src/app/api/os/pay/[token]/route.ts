import { randomBytes } from 'node:crypto'
import { ready } from '@/lib/os/sandbox'
import { paymentByToken } from '@/lib/os/payments'
import { loadSchool } from '@/lib/os/school'
import { applyPaymentEvent } from '@/lib/os/bookings'
import { dispatchOutbox } from '@/lib/os/messaging'
import { now } from '@/lib/os/clock'
import { fail, json, readJson, sameOrigin } from '@/lib/os/http'

export const dynamic = 'force-dynamic'

/**
 * Sandbox checkout: simulates the provider's result for a sandbox payment.
 * It goes through the same applyPaymentEvent path as a verified Stripe webhook.
 * Refused for any payment routed to a real provider.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(req)) return fail('Cross-site request blocked.', 403)
  const { token } = await params
  const db = await ready()
  const p = await paymentByToken(db, token)
  if (!p) return fail('Payment link not found.', 404)
  if (p.provider !== 'sandbox') return fail('This payment is processed by Stripe.', 400)
  if (!['pending', 'failed'].includes(p.status)) return fail(`This payment is ${p.status}.`, 409)
  if (p.expires_at && new Date(p.expires_at) < now()) return fail('This payment link has expired. Text us for a new time.', 410)
  const body = await readJson<{ outcome?: 'paid' | 'declined' }>(req)
  const school = (await loadSchool(db, p.school_id))!
  const kind = body.outcome === 'declined' ? 'failed' : 'paid'
  const r = await db.tx((q) => applyPaymentEvent({ q, school }, { paymentId: p.id, kind, eventId: `sandbox_${randomBytes(9).toString('hex')}`, reason: kind === 'failed' ? 'test card declined' : undefined, providerRef: `sandbox_${p.id.slice(0, 8)}` }))
  await dispatchOutbox(db, school.id)
  return json({ ok: true, status: r.payment.status, outcome: r.outcome })
}
