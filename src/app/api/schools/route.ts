import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

import { validateRequired } from '@/lib/validation'
import Stripe from 'stripe'

export async function GET() {
  return NextResponse.json({
    DEMO_MODE: process.env.DEMO_MODE,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}

// ── POST /api/schools ──────────────────────────────────────────────────
// POST /api/schools — create a new school
// Auth: DEMO_MODE skips auth (open demo signups). Non-demo REQUIRES Bearer token.
export async function POST(request: Request) {
  const body = await request.json()
  validateRequired(body, ['schoolName', 'email'])
  const { schoolName, ownerName, email, phone, state } = body

  if (!schoolName || !email) {
    return NextResponse.json({ error: 'schoolName and email required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const slug = schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '-' + Date.now().toString(36)

  // Non-demo: require authentication
  if (process.env.DEMO_MODE !== 'true') {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    // Use authenticated user's email as owner_email
    if (email !== user.email) {
      return NextResponse.json({ error: 'Email must match authenticated account' }, { status: 403 })
    }
  }

  // Check if email already owns a school
  const { data: existing } = await admin
    .from('schools')
    .select('id')
    .eq('owner_email', email)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'A school with this email already exists' }, { status: 409 })
  }

  const { data: school, error: schoolError } = await admin
    .from('schools')
    .insert({
      name: schoolName,
      slug,
      owner_email: email,
      owner_name: ownerName ?? null,
      phone: phone ?? null,
      state: state ?? 'TN',
      plan_tier: 'starter',
      active: true,
    })
    .select('id, name, slug')
    .single()

  if (schoolError || !school) {
    return NextResponse.json({ error: schoolError?.message ?? 'Failed to create school' }, { status: 500 })
  }

  // DEMO_MODE: skip Stripe, return onboarding URL
  if (process.env.DEMO_MODE === 'true') {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roadsmith-website.vercel.app'
    return NextResponse.json({
      schoolId: school.id,
      slug: school.slug,
      checkoutUrl: `${origin}/onboarding?school_id=${school.id}&slug=${school.slug}&step=profile`,
      demoMode: true,
    })
  }

  // NON-DEMO: full Stripe flow
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [{ price: process.env.STRIPE_STARTER_PRICE_ID!, quantity: 1 }],
    metadata: { school_id: school.id, school_name: schoolName, owner_name: ownerName ?? '', state: state ?? 'TN' },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://roadsmith-website.vercel.app'}/onboarding?school_id=${school.id}&step=profile`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://roadsmith-website.vercel.app'}/signup?error=checkout_cancelled`,
  })

  if (checkoutSession.customer) {
    await admin.from('schools').update({ stripe_customer_id: checkoutSession.customer as string }).eq('id', school.id)
  }

  return NextResponse.json({ schoolId: school.id, slug: school.slug, checkoutUrl: checkoutSession.url })
}
