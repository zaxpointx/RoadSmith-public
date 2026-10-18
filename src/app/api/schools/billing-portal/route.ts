import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY required')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as const })
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const schoolId = user.user_metadata?.school_id
  if (!schoolId) {
    return NextResponse.json({ error: 'No school linked to your account' }, { status: 400 })
  }

  const adminClient = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: school } = await adminClient
    .from('schools')
    .select('stripe_customer_id, subscription_status, name')
    .eq('id', schoolId)
    .single()

  if (!school?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found. Please contact support.' }, { status: 400 })
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: school.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/school-admin`,
  })

  return NextResponse.json({ url: session.url })
}
