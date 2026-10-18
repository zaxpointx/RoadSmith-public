import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { auditLog } from '@/lib/security'
import type { BookingWithSession } from '@/lib/supabase/types'

type QueryError = { message: string }
type BookingSession = NonNullable<BookingWithSession['session']>
type BookingLinkRecord = BookingWithSession & {
  session_date: string | null
  session_time: string | null
  payment_status: string | null
  session: (BookingSession & { location?: string | null }) | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Full query for GET: include all session relations for confirmation page
  const primaryResult = await (supabaseAdmin
    .from('bookings')
    .select(`
      *,
      session:session_id(
        id, school_id, start_date, location, seats_booked,
        instructor:instructors(id, name),
        session_type:session_type_id(id, name, color, duration_minutes, price_cents),
        school:schools(id, name)
      )
    `)
    .eq('booking_token', token)
    .single() as unknown as Promise<{ data: BookingLinkRecord | null; error: QueryError | null }>)
  const confirmationResult = primaryResult.data
    ? primaryResult
    : await (supabaseAdmin
      .from('bookings')
      .select(`
        *,
        session:session_id(
          id, school_id, start_date, location, seats_booked,
          instructor:instructors(id, name),
          session_type:session_type_id(id, name, color, duration_minutes, price_cents),
          school:schools(id, name)
        )
      `)
      .eq('confirmation_token', token)
      .single() as unknown as Promise<{ data: BookingLinkRecord | null; error: QueryError | null }>)
  const { data: booking, error } = confirmationResult

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Strip token fields from response
  const safeBooking = {
    id: booking.id,
    student_name: booking.student_name,
    student_email: booking.student_email,
    student_phone: booking.student_phone,
    status: booking.status,
    payment_status: booking.payment_status,
    deposit_amount_cents: booking.deposit_amount_cents,
    created_at: booking.created_at,
    session_date: booking.session_date,
    session_time: booking.session_time,
    session: booking.session,
  }
  return NextResponse.json(safeBooking)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await request.json()
  const { action } = body // 'cancel' | 'confirm'

  if (!token || !action) {
    return NextResponse.json({ error: 'Token and action required' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const primaryResult = await (supabaseAdmin
    .from('bookings')
    .select('*, session:session_id(id, school_id, start_date, seats_booked)')
    .eq('booking_token', token)
    .single() as unknown as Promise<{ data: BookingLinkRecord | null; error: QueryError | null }>)
  const confirmationResult = primaryResult.data
    ? primaryResult
    : await (supabaseAdmin
      .from('bookings')
      .select('*, session:session_id(id, school_id, start_date, seats_booked)')
      .eq('confirmation_token', token)
      .single() as unknown as Promise<{ data: BookingLinkRecord | null; error: QueryError | null }>)
  const { data: booking, error: fetchError } = confirmationResult

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Booking already cancelled' }, { status: 409 })
  }

  if (action === 'cancel') {
    const { error: cancelError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: body.reason ?? 'Customer cancelled',
      })
      .eq('id', booking.id)

    if (cancelError) {
      return NextResponse.json({ error: cancelError.message }, { status: 500 })
    }

    // Decrement seats_booked
    if (booking.session) {
      await supabaseAdmin
        .from('sessions')
        .update({ seats_booked: Math.max(0, booking.session.seats_booked - 1) })
        .eq('id', booking.session.id)
    }

    await supabaseAdmin.from('audit_logs').insert(
      auditLog('BOOKING_CANCELLED', booking.student_email, {
        booking_id: booking.id,
        reason: body.reason ?? 'Customer cancelled',
      })
    )

    return NextResponse.json({ success: true, message: 'Booking cancelled' })
  }

  if (action === 'confirm') {
    const { error: confirmError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking.id)
      .eq('status', 'pending')

    if (confirmError) {
      return NextResponse.json({ error: confirmError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Booking confirmed' })
  }

  if (action === 'reschedule') {
    const { new_session_date, new_session_time, new_session_id } = body
    if (!new_session_date || !new_session_time) {
      return NextResponse.json({ error: 'new_session_date and new_session_time required' }, { status: 400 })
    }

    // Validate new session is still bookable
    const { data: newSession } = await supabaseAdmin
      .from('sessions')
      .select('id, start_date, max_seats, seats_booked, status')
      .eq('id', new_session_id ?? '')
      .eq('status', 'scheduled')
      .single()

    if (!newSession) {
      return NextResponse.json({ error: 'Session not found or not available' }, { status: 404 })
    }

    // Check seat availability
    if ((newSession.seats_booked ?? 0) >= (newSession.max_seats ?? 1)) {
      return NextResponse.json({ error: 'Session is fully booked' }, { status: 409 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        session_id: new_session_id ?? booking.session_id,
        session_date: new_session_date,
        session_time: new_session_time,
      })
      .eq('id', booking.id)
      .in('status', ['confirmed', 'pending'])

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabaseAdmin.from('audit_logs').insert(
      auditLog('BOOKING_RESCHEDULED', booking.student_email, {
        booking_id: booking.id,
        old_date: booking.session_date,
        old_time: booking.session_time,
        new_date: new_session_date,
        new_time: new_session_time,
      })
    )

    return NextResponse.json({ success: true, message: 'Booking rescheduled', new_session_date, new_session_time })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
