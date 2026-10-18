import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const email = searchParams.get('email')
  const schoolName = searchParams.get('school_name') ?? 'Driving School'
  const state = searchParams.get('state') ?? 'TN'

  if (!email) {
    return new NextResponse('Missing email parameter', { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // Create Stripe Checkout Session for $99/mo subscription
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [
      {
        price: process.env.STRIPE_STARTER_PRICE_ID!,
        quantity: 1,
      },
    ],
    metadata: {
      school_name: schoolName,
      state,
    },
    success_url: `${origin}/school-admin?checkout=success`,
    cancel_url: `${origin}/signup?checkout=cancelled`,
  })

  return NextResponse.redirect(session.url!, 302)
}
