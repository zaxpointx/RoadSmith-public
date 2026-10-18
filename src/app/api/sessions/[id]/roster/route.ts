import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { auditLog } from '@/lib/security'

/**
 * GET  /api/sessions/[id]/roster
 *   Returns all bookings for a session, with student contact info,
 *   booking status, payment status, check-in status, and notes.
 *
 * PATCH /api/sessions/[id]/roster
 *   Body: { action: 'check_in' | 'cancel', booking_id: string, reason?: string }
 *   Updates a single booking. Check-in sets status='checked_in' and stamps
 *   a marker in notes for the timestamp (until a checked_in_at column is
 *   added to the schema). Cancel sets status='canceled'.
 *
 * Auth: x-school-id header for real auth, demo_user cookie for demo.
 */

type BookingRow = {
  id: string
  school_id: string
  student_name: string
  student_email: string
  student_phone: string | null
  status: string
  payment_status: string | null
  notes: string | null
  created_at: string
  session_id: string | null
  session_date: string | null
  session_time: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
}

type SessionDetails = {
  id: string
  school_id: string
}

type UpdatedBooking = {
  id: string
  status: string
  notes: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
}

type RosterEntry = {
  booking_id: string
  student_name: string
  student_email: string
  student_phone: string | null
  booking_status: string
  payment_status: string | null
  checked_in: boolean
  checked_in_at: string | null
  notes: string | null
  created_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
}

// ── Extract a `__checked_in_at=ISO` marker from notes ───────────────
function parseCheckedInAt(notes: string | null): string | null {
  if (!notes) return null
  const m = notes.match(/__checked_in_at=([^\s]+)/)
  return m ? m[1] : null
}

function stripCheckInMarker(notes: string | null): string | null {
  if (!notes) return null
  return notes.replace(/__checked_in_at=[^\s]+/, '').trim() || null
}

function addCheckInMarker(notes: string | null, iso: string): string {
  const stripped = stripCheckInMarker(notes)
  return stripped ? `${stripped} __checked_in_at=${iso}` : `__checked_in_at=${iso}`
}

// ── Resolve schoolId from header (real auth) or demo cookie ─────────
async function resolveSchoolId(request: Request): Promise<string | null> {
  const fromHeader = request.headers.get('x-school-id')
  if (fromHeader) return fromHeader

  const cookieStore = await cookies()
  const demo = cookieStore.get('demo_user')
  if (demo?.value) {
    try {
      const payload = JSON.parse(Buffer.from(demo.value, 'base64').toString('utf8'))
      return payload?.schoolId ?? null
    } catch {
      return null
    }
  }
  return null
}

// ── GET ──────────────────────────────────────────────────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await createClient()

  // Auth: must be logged in (works for both demo and production)
  const { data: { user } } = await supabase.auth.getUser()
  // In demo mode there's no real user — we still allow via demo_user cookie
  const demoMode = process.env.DEMO_MODE === 'true'
  if (!user && !demoMode) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const schoolId = await resolveSchoolId(request)
  if (!schoolId) {
    return new NextResponse('Missing x-school-id or demo session', { status: 400 })
  }

  // Ownership: verify the session belongs to this school
  const admin = getSupabaseAdmin()
  const sessionResult = await admin
    .from('sessions')
    .select('id, school_id, start_date, end_date, start_time, max_seats, seats_booked, location, status, instructor:instructors(id, name), session_type:session_types(id, name, duration_minutes, color)')
    .eq('id', sessionId)
    .single()
  const session = sessionResult.data as unknown as SessionDetails | null
  const sessionError = sessionResult.error

  if (sessionError || !session) {
    return new NextResponse('Session not found', { status: 404 })
  }
  if (session.school_id !== schoolId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Fetch bookings for this session
  const bookingsResult = await admin
    .from('bookings')
    .select('id, school_id, student_name, student_email, student_phone, status, payment_status, notes, created_at, session_id, session_date, session_time, cancelled_at, cancellation_reason')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  const bookings = bookingsResult.data as unknown as BookingRow[] | null
  const bookingsError = bookingsResult.error

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 })
  }

  const roster: RosterEntry[] = ((bookings as BookingRow[]) ?? []).map(b => ({
    booking_id: b.id,
    student_name: b.student_name,
    student_email: b.student_email,
    student_phone: b.student_phone,
    booking_status: b.status,
    payment_status: b.payment_status,
    checked_in: b.status === 'checked_in',
    checked_in_at: b.status === 'checked_in' ? parseCheckedInAt(b.notes) : null,
    notes: stripCheckInMarker(b.notes),
    created_at: b.created_at,
    cancelled_at: b.cancelled_at,
    cancellation_reason: b.cancellation_reason,
  }))

  return NextResponse.json({ session, roster })
}

// ── PATCH ────────────────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const body = await request.json().catch(() => ({}))
  const { action, booking_id: bookingId, reason } = body || {}

  if (!action || !bookingId) {
    return NextResponse.json({ error: 'action and booking_id are required' }, { status: 400 })
  }
  if (action !== 'check_in' && action !== 'cancel' && action !== 'uncheck_in') {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }

  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demoMode = process.env.DEMO_MODE === 'true'
  if (!user && !demoMode) return new NextResponse('Unauthorized', { status: 401 })

  const schoolId = await resolveSchoolId(request)
  if (!schoolId) return new NextResponse('Missing x-school-id or demo session', { status: 400 })

  const admin = getSupabaseAdmin()

  // Verify the booking belongs to the session + school
  const bookingResult = await admin
    .from('bookings')
    .select('id, school_id, session_id, status, notes')
    .eq('id', bookingId)
    .single()

  const booking = bookingResult.data as unknown as Pick<BookingRow, 'id' | 'school_id' | 'session_id' | 'status' | 'notes'> | null
  const fetchError = bookingResult.error
  if (fetchError || !booking) {
    return new NextResponse('Booking not found', { status: 404 })
  }
  if (booking.school_id !== schoolId) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  if (booking.session_id !== sessionId) {
    return new NextResponse('Booking does not belong to this session', { status: 409 })
  }

  let update: Record<string, unknown> = {}
  let auditAction = ''
  const nowIso = new Date().toISOString()

  if (action === 'check_in') {
    if (booking.status === 'canceled' || booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot check in a cancelled booking' }, { status: 409 })
    }
    update = {
      status: 'checked_in',
      notes: addCheckInMarker(booking.notes ?? null, nowIso),
    }
    auditAction = 'BOOKING_CHECKED_IN'
  } else if (action === 'uncheck_in') {
    update = {
      status: 'confirmed',
      notes: stripCheckInMarker(booking.notes ?? null),
    }
    auditAction = 'BOOKING_UNCHECKED_IN'
  } else if (action === 'cancel') {
    if (booking.status === 'canceled' || booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Booking already cancelled' }, { status: 409 })
    }
    update = {
      status: 'canceled',
      cancelled_at: nowIso,
      cancellation_reason: reason ?? 'Cancelled by admin',
    }
    auditAction = 'BOOKING_CANCELLED_BY_ADMIN'
  }

  // First try updating with a checked_in_at column if it exists.
  // If the column doesn't exist, Supabase returns an error — fall back
  // to the notes-marker approach (which is what we set above).
  let attempt: Record<string, unknown> = update
  if (action === 'check_in') {
    attempt = { ...update, checked_in_at: nowIso }
  } else if (action === 'uncheck_in') {
    attempt = { ...update, checked_in_at: null }
  }

  let { data: updated, error: updateError } = await admin
    .from('bookings')
    .update(attempt)
    .eq('id', bookingId)
    .select('id, status, notes, cancelled_at, cancellation_reason')
    .single()

  if (updateError && /checked_in_at/.test(updateError.message)) {
    // Column doesn't exist — retry without it (notes-marker only)
    ;({ data: updated, error: updateError } = await admin
      .from('bookings')
      .update(update)
      .eq('id', bookingId)
      .select('id, status, notes, cancelled_at, cancellation_reason')
      .single())
  }

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Decrement seats if cancelling
  if (action === 'cancel') {
    const { data: sess } = await admin
      .from('sessions')
      .select('seats_booked')
      .eq('id', sessionId)
      .single()
    const current = sess?.seats_booked ?? 0
    const next = Math.max(0, current - 1)
    await admin
      .from('sessions')
      .update({ seats_booked: next })
      .eq('id', sessionId)
  }

  // Audit log
  if (user?.id) {
    await admin.from('audit_logs').insert(
      auditLog(auditAction, user.id, {
        booking_id: bookingId,
        session_id: sessionId,
        school_id: schoolId,
        reason: reason ?? null,
      })
    )
  }

  // Return the updated row in the same shape as GET
  const updatedBooking = updated as unknown as UpdatedBooking
  const checkedInAt = updatedBooking.status === 'checked_in' ? parseCheckedInAt(updatedBooking.notes) : null
  return NextResponse.json({
    booking: {
      booking_id: updatedBooking.id,
      booking_status: updatedBooking.status,
      checked_in: updatedBooking.status === 'checked_in',
      checked_in_at: checkedInAt,
      notes: stripCheckInMarker(updatedBooking.notes),
      cancelled_at: updatedBooking.cancelled_at,
      cancellation_reason: updatedBooking.cancellation_reason,
    },
  })
}
