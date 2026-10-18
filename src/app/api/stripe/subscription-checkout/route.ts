import { NextResponse } from 'next/server'
import Stripe from 'stripe'

/**
 * POST /api/stripe/subscription-checkout
 *
 * Creates a Stripe Checkout Session for school subscription.
 *
 * Body: { priceId, schoolId, userId, email }
 * Response: { url } — Stripe Checkout URL to redirect to
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { priceId, schoolId, userId, email } = body

  if (!priceId || !schoolId || !userId || !email) {
    return NextResponse.json(
      { error: 'priceId, schoolId, userId, and email are required' },
      { status: 400 }
    )
  }

  // Stripe is optional — if not configured, skip checkout
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ url: null, skipped: true })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-03-25.dahlia' as const,
  })

  const origin = new URL(request.url).origin

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      school_id: schoolId,
      user_id: userId,
    },
    success_url: `${origin}/school-admin/onboarding?checkout=success`,
    cancel_url: `${origin}/signup?checkout=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
