import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { auditLog } from '@/lib/security'
import { ensureStudentForConfirmedBooking } from '@/lib/booking-lifecycle'
import type { CheckoutBookingData } from '@/lib/supabase/types'

export async function POST(request: Request) {
  const body = await request.json()
  const { booking_id } = body

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Get booking (admin to bypass RLS on bookings table)
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
      .select(`
      id, confirmation_token, booking_token,
      student_email,
      student_name,
      student_phone,
      instructor_id,
      deposit_amount_cents,
      status,
      session:session_id (
        id,
        school_id,
        start_date,
        location,
        session_type:session_type_id (
          name
        )
      )
    `)
    .eq('id', booking_id)
    .single() as unknown as { data: CheckoutBookingData; error: { message: string } | null }

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Booking is not pending payment' }, { status: 409 })
  }

  // Bug fix: Production requires Stripe OR explicit demo mode — never silently confirm without payment
  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')

  // No Stripe — only allow in DEMO_MODE (local dev or explicit demo deployments)
  if (!hasStripeKey) {
    if (process.env.DEMO_MODE !== 'true') {
      return NextResponse.json(
        { error: 'Payment not configured. Please configure Stripe to process bookings.' },
        { status: 503 }
      )
    }
    // DEMO_MODE=true: confirm directly without payment
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking_id)

    await ensureStudentForConfirmedBooking(supabaseAdmin, {
      bookingId: booking.id,
      schoolId: booking.session.school_id,
      studentName: booking.student_name,
      studentEmail: booking.student_email,
      studentPhone: booking.student_phone,
      instructorId: booking.instructor_id,
    })

    return NextResponse.json({ demo: true, confirmed: true })
  }

  // Stripe is configured — create checkout session
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('name')
    .eq('id', booking.session.school_id)
    .single()

  const sessionTypeName = booking.session.session_type?.name ?? 'Lesson'
  const dateStr = new Date(`${booking.session.start_date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${sessionTypeName} — ${dateStr}`,
            description: `${school?.name ?? 'Driving Lesson'} deposit — credited toward total`,
          },
          unit_amount: booking.deposit_amount_cents,
        },
        quantity: 1,
      },
    ],
    customer_email: booking.student_email,
    metadata: {
      booking_id: booking.id,
      session_id: booking.session.id,
      school_id: booking.session.school_id,
      student_email: booking.student_email,
      student_name: booking.student_name,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/confirmation?token=${booking.booking_token}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/cancel?token=${booking.booking_token}`,
  })

  await supabaseAdmin.from('audit_logs').insert(
    auditLog('STRIPE_CHECKOUT_CREATED', booking.student_email, {
      booking_id: booking.id,
      deposit_cents: booking.deposit_amount_cents,
      checkout_session_id: checkoutSession.id,
    })
  )

  return NextResponse.json({ url: checkoutSession.url })
}
