import Stripe from 'stripe'
import { ready } from '@/lib/os/sandbox'
import { appUrl, paymentByToken } from '@/lib/os/payments'
import { loadSchool } from '@/lib/os/school'
import { now } from '@/lib/os/clock'

export const dynamic = 'force-dynamic'

/** Creates a Stripe Checkout Session for a Stripe-routed payment and redirects to it. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = await ready()
  const p = await paymentByToken(db, token)
  const back = `${appUrl()}/pay/${token}`
  if (!p || p.provider !== 'stripe' || !['pending', 'failed'].includes(p.status) || (p.expires_at && new Date(p.expires_at) < now())) return Response.redirect(back, 303)
  const school = (await loadSchool(db, p.school_id))!
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: p.currency, unit_amount: p.amount_cents, product_data: { name: p.description.slice(0, 120) } } }],
    metadata: { roadsmith_payment_id: p.id, school: school.slug },
    payment_intent_data: { metadata: { roadsmith_payment_id: p.id } },
    success_url: `${back}?done=1`,
    cancel_url: back,
    ...(p.expires_at ? { expires_at: Math.max(Math.floor(+new Date(p.expires_at) / 1000), Math.floor(Date.now() / 1000) + 1800) } : {}),
  })
  await db.query(`update rs.payments set checkout_url = $2 where id = $1`, [p.id, session.url])
  return Response.redirect(session.url!, 303)
}
