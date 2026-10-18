import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { auditLog } from '@/lib/security'
import { isEmailConfigured } from '@/lib/email'
import { ensureStudentForConfirmedBooking } from '@/lib/booking-lifecycle'

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY required')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as const })
}

function verifyWebhook(body: string, signature: string): Stripe.Event {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET required')
  return getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
}

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) return new NextResponse('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = verifyWebhook(body, signature)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid webhook signature'
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 401 })
  }

  // Idempotency check — Stripe can send the same event multiple times
  const supabaseAdmin = getSupabaseAdmin()
  const { data: existing } = await supabaseAdmin
    .from('processed_stripe_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ received: true, note: 'already processed' })
  }
  await supabaseAdmin
    .from('processed_stripe_events')
    .insert({ event_id: event.id, processed_at: new Date().toISOString() })

  // ── School subscription checkout completed ─────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { metadata } = session
    const bookingId = metadata?.booking_id

    if (bookingId) {
      // ── Booking deposit payment ─────────────────────────────────────
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, status, session_id, school_id, instructor_id, student_name, student_email, student_phone, confirmation_token, session_time, session_date')
        .eq('id', bookingId)
        .eq('status', 'pending')
        .single()

      if (booking) {
        await supabaseAdmin
          .from('bookings')
          .update({
            status: 'confirmed',
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq('id', bookingId)

        if (booking.session_id) {
          const { data: sess } = await supabaseAdmin
            .from('sessions')
            .select('seats_booked, start_date, location, school_id, session_type:session_type_id(name)')
            .eq('id', booking.session_id)
            .single()
          if (sess) {
            await ensureStudentForConfirmedBooking(supabaseAdmin, {
              bookingId: booking.id,
              schoolId: sess.school_id,
              studentName: booking.student_name,
              studentEmail: booking.student_email,
              studentPhone: booking.student_phone,
              instructorId: booking.instructor_id,
            })

            // Send booking confirmation email (non-blocking — failures log but don't break the flow)
            try {
              if (isEmailConfigured()) {
                const { sendBookingConfirmationEmail } = await import('@/lib/email')

                const { data: school } = await supabaseAdmin
                  .from('schools')
                  .select('name, phone')
                  .eq('id', sess.school_id)
                  .single()

                const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
                const token = booking.confirmation_token ?? bookingId
                const sessionTypeName = (sess.session_type as { name?: string } | null)?.name ?? 'Driving Lesson'
                const date = new Date(`${sess.start_date}T12:00:00`)
                  .toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })

                await sendBookingConfirmationEmail(
                  booking.student_email,
                  booking.student_name,
                  sessionTypeName,
                  school?.name ?? 'Driving School',
                  school?.phone ?? '',
                  date,
                  booking.session_time ?? '9:00 AM',
                  sess.location,
                  `${appUrl}/book/reschedule/${token}`,
                  `${appUrl}/book/cancel/${token}`
                )

                await supabaseAdmin.from('audit_logs').insert(
                  auditLog('BOOKING_CONFIRMATION_EMAIL_SENT', booking.student_email, {
                    booking_id: bookingId,
                  })
                )
              }
            } catch (emailErr) {
              console.error('[Stripe Webhook] Failed to send booking confirmation email:', emailErr)
              await supabaseAdmin.from('audit_logs').insert(
                auditLog('BOOKING_CONFIRMATION_EMAIL_FAILED', booking.student_email, {
                  booking_id: bookingId,
                  error: (emailErr as Error).message,
                })
              )
            }
          }
        }
      }

      await supabaseAdmin.from('audit_logs').insert(
        auditLog('BOOKING_DEPOSIT_PAID', metadata?.student_email ?? 'unknown', {
          booking_id: bookingId,
          amount_cents: session.amount_total,
          stripe_session_id: session.id,
        })
      )

    } else if (metadata?.school_id) {
      // ── School subscription checkout completed ─────────────────────
      const schoolId = metadata.school_id
      const customerId = session.customer as string

      await supabaseAdmin
        .from('schools')
        .update({
          subscription_status: 'active',
          stripe_customer_id: customerId,
        })
        .eq('id', schoolId)

      await supabaseAdmin.from('audit_logs').insert(
        auditLog('SUBSCRIPTION_ACTIVATED', 'stripe-webhook', {
          school_id: schoolId,
          stripe_customer_id: customerId,
        })
      )
    }

    // Legacy: payment without school_id
    if (!bookingId && !metadata?.school_id) {
      await supabaseAdmin.from('payments').insert({
        student_email: session.customer_details?.email ?? 'unknown',
        stripe_session_id: session.id,
        amount: session.amount_total ?? 0,
        status: 'paid',
      })
    }
  }

  // ── Checkout session expired (booking was not confirmed) ────────────
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const bookingId = session.metadata?.booking_id

    if (bookingId) {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, status, session_id')
        .eq('id', bookingId)
        .eq('status', 'pending')
        .single()

      if (booking) {
        await supabaseAdmin
          .from('bookings')
          .update({ status: 'expired' })
          .eq('id', bookingId)

        if (booking.session_id) {
          const { data: sess } = await supabaseAdmin
            .from('sessions')
            .select('seats_booked')
            .eq('id', booking.session_id)
            .single()
          if (sess && sess.seats_booked > 0) {
            await supabaseAdmin
              .from('sessions')
              .update({ seats_booked: sess.seats_booked - 1 })
              .eq('id', booking.session_id)
          }
        }
      }
    }
  }

  // ── Subscription updated ─────────────────────────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const customerId = sub.customer as string
    const status = sub.status // active, trialing, past_due, canceled, incomplete

    // Map Stripe status to our status
    const statusMap: Record<string, string> = {
      active: 'active',
      trialing: 'trial',
      past_due: 'past_due',
      canceled: 'cancelled',
      incomplete: 'trial',
      unpaid: 'past_due',
    }
    const ourStatus = statusMap[status] ?? 'trial'

    await supabaseAdmin
      .from('schools')
      .update({
        subscription_status: ourStatus,
        subscription_id: sub.id,
      })
      .eq('stripe_customer_id', customerId)

    await supabaseAdmin.from('audit_logs').insert(
      auditLog('SUBSCRIPTION_UPDATED', 'stripe-webhook', {
        stripe_subscription_id: sub.id,
        stripe_status: status,
        our_status: ourStatus,
      })
    )
  }

  // ── Subscription deleted (cancelled) ─────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const customerId = sub.customer as string

    await supabaseAdmin
      .from('schools')
      .update({ subscription_status: 'cancelled' })
      .eq('stripe_customer_id', customerId)

    await supabaseAdmin.from('audit_logs').insert(
      auditLog('SUBSCRIPTION_CANCELLED', 'stripe-webhook', {
        stripe_subscription_id: sub.id,
      })
    )
  }

  // ── Invoice payment failed ─────────────────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = invoice.customer as string

    await supabaseAdmin
      .from('schools')
      .update({ subscription_status: 'past_due' })
      .eq('stripe_customer_id', customerId)

    await supabaseAdmin.from('audit_logs').insert(
      auditLog('SUBSCRIPTION_PAST_DUE', 'stripe-webhook', {
        stripe_customer_id: customerId,
        invoice_id: invoice.id,
      })
    )
  }

  return NextResponse.json({ received: true })
}
