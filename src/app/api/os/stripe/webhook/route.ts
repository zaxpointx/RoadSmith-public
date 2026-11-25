import Stripe from 'stripe'
import { ready } from '@/lib/os/sandbox'
import { one } from '@/lib/os/db'
import { loadSchool } from '@/lib/os/school'
import { applyPaymentEvent } from '@/lib/os/bookings'

export const dynamic = 'force-dynamic'

/** Stripe → payment status. Signature-verified and idempotent on the event id. */
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY, whsec = process.env.ROADSMITH_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET
  if (!key || !whsec) return new Response('Stripe not configured', { status: 503 })
  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = new Stripe(key).webhooks.constructEvent(raw, req.headers.get('stripe-signature') ?? '', whsec)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }
  let paymentId: string | undefined, kind: 'paid' | 'failed' | undefined, providerRef: string | undefined, reason: string | undefined
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object as Stripe.Checkout.Session
    if (s.payment_status === 'paid') { paymentId = s.metadata?.roadsmith_payment_id; kind = 'paid'; providerRef = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id }
  } else if (event.type === 'checkout.session.async_payment_failed') {
    const s = event.data.object as Stripe.Checkout.Session
    paymentId = s.metadata?.roadsmith_payment_id; kind = 'failed'; reason = 'bank payment failed'
  } else if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent
    paymentId = pi.metadata?.roadsmith_payment_id; kind = 'failed'; reason = pi.last_payment_error?.message ?? 'card declined'
  }
  if (!paymentId || !kind) return Response.json({ ignored: event.type })
  const db = await ready()
  const p = await one<{ school_id: string }>(db, `select school_id from rs.payments where id = $1`, [paymentId])
  if (!p) return Response.json({ ignored: 'unknown payment' })
  const school = (await loadSchool(db, p.school_id))!
  const r = await db.tx((q) => applyPaymentEvent({ q, school }, { paymentId: paymentId!, kind: kind!, eventId: event.id, reason, providerRef }))
  const { dispatchOutbox } = await import('@/lib/os/messaging')
  await dispatchOutbox(db, school.id)
  return Response.json({ ok: true, outcome: r.outcome })
}
