import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { auditLog } from '@/lib/security'
import { validateRequired } from '@/lib/validation'
import { isEmailConfigured } from '@/lib/email'
import { ensureStudentForConfirmedBooking } from '@/lib/booking-lifecycle'

// ── POST /api/bookings ─────────────────────────────────────────────────
export async function POST(request: Request) {
  const body = await request.json()
  const { session_id, session_date, session_time, student_name, student_email, student_phone } = body

  // Require session_id for new booking (must pick a specific session)
  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required to book a slot' }, { status: 400 })
  }

  // ── Input validation ──
  try {
    validateRequired(body, ['session_date', 'session_time', 'student_name', 'student_email'])
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!emailRegex.test(student_email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  // Phone digits check
  if (student_phone) {
    const digits = student_phone.replace(/\D/g, '')
    if (digits.length < 10) {
      return NextResponse.json({ error: 'Phone number must have at least 10 digits' }, { status: 400 })
    }
  }

  const admin = getSupabaseAdmin()
  let depositAmount = 2500
  let sessionSchoolId: string | null = null

  // Resolve session metadata (deposit amount, school) before atomic booking
  if (session_id) {
    const { data: rawSession } = await admin
      .from('sessions')
      .select('id, school_id, seats_booked, max_seats, session_type_id')
      .eq('id', session_id)
      .eq('status', 'scheduled')
      .single()

    if (!rawSession) {
      return NextResponse.json({ error: 'Session not found or not available' }, { status: 404 })
    }

    sessionSchoolId = rawSession.school_id

    // Get deposit from session type
    if (rawSession.session_type_id) {
      const { data: st } = await admin
        .from('session_types')
        .select('deposit_cents')
        .eq('id', rawSession.session_type_id)
        .maybeSingle()
      if (st?.deposit_cents) depositAmount = st.deposit_cents
    }
  }

  // Check for duplicate booking (idempotency)
  const { data: existing } = await admin
    .from('bookings')
    .select('id')
    .eq('session_date', session_date)
    .eq('session_time', session_time)
    .eq('student_email', student_email)
    .in('status', ['pending', 'confirmed'])
    .single()
  if (existing) {
    return NextResponse.json({ error: 'You have already booked this session' }, { status: 409 })
  }

  const bookingToken = crypto.randomUUID()
  const status = depositAmount > 0 ? 'pending' : 'confirmed'
  const paymentStatus = depositAmount > 0 ? 'pending' : 'paid'

  // ── Seat booking with availability check ──
  // Checks seats, inserts booking, and increments seats_booked.
  // Note: not fully atomic — demo/low-traffic usage only.
  const { data: session, error: sessionError } = await admin
    .from('sessions')
    .select('id, seats_booked, max_seats')
    .eq('id', session_id)
    .eq('status', 'scheduled')
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found or not available' }, { status: 404 })
  }
  if ((session.seats_booked ?? 0) >= (session.max_seats ?? 1)) {
    return NextResponse.json({ error: 'This session is fully booked' }, { status: 409 })
  }

  const { data: inserted, error: insertError } = await admin
    .from('bookings')
    .insert({
      session_id,
      school_id: sessionSchoolId ?? undefined,
      student_name,
      student_email,
      student_phone: student_phone ?? null,
      session_date,
      session_time,
      status,
      payment_status: paymentStatus,
      deposit_amount_cents: depositAmount,
      booking_token: bookingToken,
      confirmation_token: bookingToken,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('booking insert error:', insertError)
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'You have already booked this session' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Booking failed — please try again' }, { status: 500 })
  }

  const bookingId = inserted.id

  // Increment seat count
  await admin
    .from('sessions')
    .update({ seats_booked: (session.seats_booked ?? 0) + 1 })
    .eq('id', session_id)

  // Audit log
  if (sessionSchoolId) {
    await admin.from('audit_logs').insert(
      auditLog('BOOKING_CREATED', student_email, {
        booking_id: bookingId,
        session_id: session_id ?? null,
        school_id: sessionSchoolId,
        deposit_amount_cents: depositAmount,
      })
    )
  }

  // ── Send confirmation email for confirmed (no-deposit) bookings ──
  // Stripe webhook handles email for paid deposit bookings.
  // This fires for demo-mode / free bookings immediately after insert.
  if (depositAmount === 0) {
    await sendBookingEmail(admin, bookingId, session_id, session_date, session_time, student_name, student_email, sessionSchoolId)

    // ── ROA-13: Auto-link booking to existing/new student record ──
    // For confirmed (no-deposit) bookings we link immediately so the
    // student's booking history is correct from the start. The
    // deposit-pending path is handled by the Stripe webhook.
    const linkResult = await ensureStudentForConfirmedBooking(admin, {
      bookingId,
      schoolId: sessionSchoolId ?? '',
      studentName: student_name,
      studentEmail: student_email,
      studentPhone: student_phone ?? null,
    })
    // link_status is now on the booking row. Attach to response for client visibility.
    return NextResponse.json({
      booking_id: bookingId,
      booking_token: bookingToken,
      status: 'confirmed',
      deposit_amount_cents: depositAmount,
      next_steps: 'Booking confirmed',
      student_link: {
        status: linkResult.status,
        reason: 'reason' in linkResult ? linkResult.reason : undefined,
        candidate_student_ids:
          'candidateIds' in linkResult ? linkResult.candidateIds : undefined,
      },
    }, { status: 201 })
  }

  return NextResponse.json({
    booking_id: bookingId,
    booking_token: bookingToken,
    status: depositAmount > 0 ? 'pending_payment' : 'confirmed',
    deposit_amount_cents: depositAmount,
    next_steps: depositAmount > 0 ? 'Redirect to Stripe checkout' : 'Booking confirmed',
  }, { status: 201 })
}

// ── GET /api/bookings?school_id=X ─────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const schoolId = searchParams.get('school_id')
  const status = searchParams.get('status')

  if (!schoolId) return NextResponse.json({ error: 'school_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .eq('owner_email', user.email)
    .single()
  if (!school) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()
  let query = admin
    .from('bookings')
    .select('id, student_name, student_email, student_phone, status, payment_status, booking_token, session_date, session_time, created_at, reminder_48h_sent, reminder_4h_sent, student_id, link_status')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: bookings, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(bookings ?? [])
}

// ── Confirmation email helper (used by POST for no-deposit bookings) ──
async function sendBookingEmail(
  admin: ReturnType<typeof getSupabaseAdmin>,
  bookingId: string,
  sessionId: string,
  sessionDate: string,
  sessionTime: string,
  studentName: string,
  studentEmail: string,
  schoolId: string | null
): Promise<void> {
  if (!isEmailConfigured()) {
    console.log(`[Booking Email STUB] → ${studentEmail} | ${studentName} | ${sessionDate} ${sessionTime}`)
    return
  }

  try {
    // Fetch session + school data for the email
    const { data: sess } = await admin
      .from('sessions')
      .select('location, school_id, session_type:session_type_id(name)')
      .eq('id', sessionId)
      .single() as unknown as {
        data: {
          location: string | null
          session_type: { name: string } | null
        } | null
      }

    const { data: school } = await admin
      .from('schools')
      .select('name, phone')
      .eq('id', schoolId ?? '')
      .single()

    const { sendBookingConfirmationEmail } = await import('@/lib/email')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const token = bookingId
    const sessionTypeName =
      sess?.session_type && typeof sess.session_type === 'object' && 'name' in sess.session_type && typeof sess.session_type.name === 'string'
        ? sess.session_type.name
        : 'Driving Lesson'
    const date = new Date(`${sessionDate}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })
    const [h, m] = (sessionTime ?? '09:00').split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    const time = `${hour}:${m.toString().padStart(2, '0')} ${ampm}`

    await sendBookingConfirmationEmail(
      studentEmail,
      studentName,
      sessionTypeName,
      school?.name ?? 'Driving School',
      school?.phone ?? '',
      date,
      time,
      sess?.location ?? '',
      `${appUrl}/book/reschedule/${token}`,
      `${appUrl}/book/cancel/${token}`
    )

    await admin.from('audit_logs').insert(
      auditLog('BOOKING_CONFIRMATION_EMAIL_SENT', studentEmail, {
        booking_id: bookingId,
      })
    )
  } catch (err) {
    console.error('[Booking POST] Failed to send confirmation email:', err)
    await admin.from('audit_logs').insert(
      auditLog('BOOKING_CONFIRMATION_EMAIL_FAILED', studentEmail, {
        booking_id: bookingId,
        error: (err as Error).message,
      })
    )
  }
}
