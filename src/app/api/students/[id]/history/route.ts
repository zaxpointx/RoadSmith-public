import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/server'

type HistoryBooking = { id: string; session_id: string | null; session_date: string | null; session_time: string | null; status: string | null; payment_status: string | null; deposit_amount_cents: number | null; deposit_paid_at: string | null; stripe_payment_intent_id: string | null; notes: string | null; created_at: string; cancelled_at: string | null; cancellation_reason: string | null; session_type: { name: string } | null; instructor: { name: string } | null }
type HistorySession = { id: string; status: string; start_date: string; start_at?: string | null; end_date?: string | null; start_time?: string | null; location: string | null }

/**
 * GET /api/students/[id]/history
 *
 * Returns the full booking history for a single student enrolled at a
 * driving school. Each row contains:
 *   - booking_status  (pending | confirmed | checked_in | completed | cancelled | no_show)
 *   - payment_status  (pending | paid | refunded | failed)
 *   - checked_in_at   (ISO timestamp or null — extracted from the
 *                      `__checked_in_at=ISO` marker in booking.notes)
 *   - completed_at    (ISO timestamp or null — derived from the parent
 *                      session's status = 'completed' + start_at/start_date)
 *   - session metadata (date, time, type, instructor, location)
 *
 * Used by the ROA-14 student booking-history view.
 */

// ── Check-in marker helpers (kept consistent with /api/sessions/[id]/roster)
function parseCheckedInAt(notes: string | null | undefined): string | null {
  if (!notes) return null
  const m = String(notes).match(/__checked_in_at=([^\s]+)/)
  return m ? m[1] : null
}

function stripCheckInMarker(notes: string | null | undefined): string | null {
  if (!notes) return null
  const stripped = String(notes).replace(/__checked_in_at=[^\s]+/, '').trim()
  return stripped.length > 0 ? stripped : null
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params

  // AuthN: real user OR demo mode
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const demoMode = process.env.DEMO_MODE === 'true'
  if (!user && !demoMode) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const schoolId = await resolveSchoolId(request)
  if (!schoolId) {
    return new NextResponse('Missing x-school-id or demo session', { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Verify student ownership (defence in depth even if student_id is on the booking)
  const { data: student, error: studentError } = await admin
    .from('students_driver_ed')
    .select('id, legal_name, school_id')
    .eq('id', studentId)
    .single()

  if (studentError || !student) {
    return new NextResponse('Student not found', { status: 404 })
  }
  if (student.school_id !== schoolId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Pull bookings (most recent first) — include everything we need
  // to derive check-in, payment, and completion status in one query.
  const { data: bookings, error: bookingsError } = await admin
    .from('bookings')
    .select(`
      id,
      session_id,
      session_date,
      session_time,
      status,
      payment_status,
      deposit_amount_cents,
      deposit_paid_at,
      stripe_payment_intent_id,
      notes,
      created_at,
      cancelled_at,
      cancellation_reason,
      session_type:session_type_id(name),
      instructor:instructor_id(name)
    `)
    .eq('student_id', studentId)
    .order('session_date', { ascending: false })

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 })
  }

  // Pull the parent session rows so we can expose the session-level
  // completion timestamp. We only fetch what we need to keep the call
  // cheap on schools with many sessions.
  const sessionIds = Array.from(
    new Set(((bookings as HistoryBooking[] | null) ?? []).map(b => b.session_id).filter((id): id is string => id !== null))
  )

  let sessionsById: Record<string, HistorySession> = {}
  if (sessionIds.length > 0) {
    const { data: sessions, error: sessionsError } = await admin
      .from('sessions')
      .select('id, status, start_date, start_at, end_date, start_time, location')
      .in('id', sessionIds)

    if (!sessionsError && sessions) {
      sessionsById = Object.fromEntries((sessions as HistorySession[]).map(s => [s.id, s]))
    }
  }

  // Shape each row for the UI
  const history = ((bookings as HistoryBooking[] | null) ?? []).map(b => {
    const session = b.session_id ? sessionsById[b.session_id] ?? null : null
    const checkedIn = b.status === 'checked_in' || b.status === 'completed'
    const checked_in_at = checkedIn ? parseCheckedInAt(b.notes) : null
    const isCompleted = session?.status === 'completed' || b.status === 'completed'
    const completed_at = isCompleted
      ? (session?.start_at ?? (session?.start_date ? `${session.start_date}T${session?.start_time ?? '12:00:00'}Z` : null))
      : null

    return {
      id: b.id,
      session_id: b.session_id ?? null,
      session_date: b.session_date ?? session?.start_date ?? null,
      session_time: b.session_time ?? session?.start_time ?? null,
      session_location: session?.location ?? null,
      session_type: b.session_type ?? null,
      instructor: b.instructor ?? null,

      // Statuses the admin UI cares about
      booking_status: b.status ?? 'pending',
      payment_status: b.payment_status ?? null,

      // Timestamps
      checked_in: checkedIn,
      checked_in_at,
      completed: isCompleted,
      completed_at,

      // Bookkeeping
      deposit_amount_cents: b.deposit_amount_cents ?? 0,
      deposit_paid_at: b.deposit_paid_at ?? null,
      cancelled_at: b.cancelled_at ?? null,
      cancellation_reason: b.cancellation_reason ?? null,
      created_at: b.created_at,
      notes: stripCheckInMarker(b.notes),
    }
  })

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.legal_name ?? null,
    },
    history,
  })
}
