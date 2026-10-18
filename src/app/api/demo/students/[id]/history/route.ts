import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/demo/students/[id]/history
 *
 * Demo-mode mirror of /api/students/[id]/history. Returns the full
 * booking history for a single student with booking status, payment
 * status, check-in time, and completion.
 */

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

type BookingRow = { id: string; session_id: string | null; session_date: string | null; session_time: string | null; status: string | null; payment_status: string | null; deposit_amount_cents: number | null; deposit_paid_at: string | null; notes: string | null; created_at: string; cancelled_at: string | null; cancellation_reason: string | null; session_type?: unknown; instructor?: unknown }
type SessionRow = { id: string; status: string | null; start_date: string | null; start_at?: string | null; end_date?: string | null; start_time?: string | null; location?: string | null }

async function getDemoSession() {
  const cookieStore = await cookies()
  const demoUserCookie = cookieStore.get('demo_user')
  if (!demoUserCookie?.value) return null
  try {
    const payload = JSON.parse(Buffer.from(demoUserCookie.value, 'base64').toString('utf8'))
    if (!payload?.schoolId) return null
    return payload as { schoolId: string; userId: string; email: string }
  } catch {
    return null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const session = await getDemoSession()
  if (!session) return NextResponse.json({ error: 'No demo session' }, { status: 401 })

  const { id: studentId } = await params
  const admin = getSupabaseAdmin()

  // Verify the student belongs to the demo school
  const { data: student, error: studentError } = await admin
    .from('students_driver_ed')
    .select('id, legal_name, school_id')
    .eq('id', studentId)
    .single()

  if (studentError || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }
  if (student.school_id !== session.schoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  const bookingRows = (bookings ?? []) as unknown as BookingRow[]
  const sessionIds = Array.from(new Set(bookingRows.map((b) => b.session_id).filter((id): id is string => Boolean(id))))

  let sessionsById: Record<string, SessionRow> = {}
  if (sessionIds.length > 0) {
    const { data: sessions, error: sessionsError } = await admin
      .from('sessions')
      .select('id, status, start_date, start_at, end_date, start_time, location')
      .in('id', sessionIds)

    if (!sessionsError && sessions) {
      sessionsById = Object.fromEntries((sessions as unknown as SessionRow[]).map((s) => [s.id, s]))
    }
  }

  const history = bookingRows.map((b) => {
    const s = b.session_id ? sessionsById[b.session_id] ?? null : null
    const checkedIn = b.status === 'checked_in' || b.status === 'completed'
    const checked_in_at = checkedIn ? parseCheckedInAt(b.notes) : null
    const isCompleted = s?.status === 'completed' || b.status === 'completed'
    const completed_at = isCompleted
      ? (s?.start_at ?? (s?.start_date ? `${s.start_date}T${s?.start_time ?? '12:00:00'}Z` : null))
      : null

    return {
      id: b.id,
      session_id: b.session_id ?? null,
      session_date: b.session_date ?? s?.start_date ?? null,
      session_time: b.session_time ?? s?.start_time ?? null,
      session_location: s?.location ?? null,
      session_type: b.session_type ?? null,
      instructor: b.instructor ?? null,

      booking_status: b.status ?? 'pending',
      payment_status: b.payment_status ?? null,

      checked_in: checkedIn,
      checked_in_at,
      completed: isCompleted,
      completed_at,

      deposit_amount_cents: b.deposit_amount_cents ?? 0,
      deposit_paid_at: b.deposit_paid_at ?? null,
      cancelled_at: b.cancelled_at ?? null,
      cancellation_reason: b.cancellation_reason ?? null,
      created_at: b.created_at,
      notes: stripCheckInMarker(b.notes),
    }
  })

  return NextResponse.json({
    student: { id: student.id, name: student.legal_name ?? null },
    history,
  })
}
