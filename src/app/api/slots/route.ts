import { NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'

type SessionTypeRow = {
  id: string
  name: string
  duration_minutes: number
  price_cents: number
  deposit_cents: number
  description: string | null
}

type SlotSession = {
  id: string
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  max_seats: number | null
  instructor: { id: string; name: string } | null
  session_type: { price_cents: number | null; deposit_cents: number | null } | null
}

type SessionBookingRow = { session_id: string }

/**
 * GET /api/slots — get available session slots for a school + session type.
 *
 * Uses service role (admin) for session type lookup in DEMO_MODE so RLS
 * doesn't block the public booking page.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const schoolId = searchParams.get('school_id')
  const sessionTypeId = searchParams.get('session_type_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const instructorId = searchParams.get('instructor_id')

  if (!schoolId || !sessionTypeId) {
    return NextResponse.json(
      { error: 'school_id and session_type_id are required' },
      { status: 400 }
    )
  }

  const isDemo = process.env.DEMO_MODE === 'true'
  const admin = getSupabaseAdmin()
  const supabase = await createClient()

  const start = startDate ?? new Date().toISOString().split('T')[0]
  const end = endDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Get session type details — use admin in DEMO_MODE to bypass RLS
  const { data: sessionType } = await (isDemo ? admin : supabase)
    .from('session_types')
    .select('*')
    .eq('id', sessionTypeId)
    .eq('school_id', schoolId)
    .single()

  if (!sessionType) {
    return NextResponse.json({ error: 'Session type not found' }, { status: 404 })
  }

  // Direct query using actual schema: sessions has status TEXT, start_date DATE
  // NO cancelled column, NO start_time column
  let sessionQuery = admin
    .from('sessions')
    .select('*, instructor:instructors(id, name), session_type:session_types(name, price_cents, deposit_cents)')
    .eq('school_id', schoolId)
    .eq('session_type_id', sessionTypeId)
    .eq('status', 'scheduled')
    .gte('start_date', start)
    .lte('start_date', end)
    .order('start_date', { ascending: true })

  if (instructorId) {
    sessionQuery = sessionQuery.eq('instructor_id', instructorId)
  }

  const { data: sessions, error } = await sessionQuery

  if (error) {
    console.error('Slots query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get existing bookings to calculate available seats
  const typedSessions = (sessions ?? []) as unknown as SlotSession[]
  const sessionIds = typedSessions.map((s) => s.id)
  let bookingsBySession: Record<string, number> = {}

  if (sessionIds.length > 0) {
    const { data: bookings } = await admin
      .from('bookings')
      .select('session_id')
      .in('session_id', sessionIds)
      .in('status', ['pending', 'confirmed'])

    bookingsBySession = ((bookings ?? []) as SessionBookingRow[]).reduce((acc: Record<string, number>, b) => {
      acc[b.session_id] = (acc[b.session_id] ?? 0) + 1
      return acc
    }, {})
  }

  const slots = typedSessions.map((session) => {
    const instructorData = session.instructor
    return {
      id: session.id,
      session_date: session.start_date,
      end_date: session.end_date,
      start_time: session.start_time ?? '09:00',
      end_time: session.end_time ?? null,
      location: session.location,
      instructor_id: instructorData?.id ?? null,
      instructor_name: instructorData?.name ?? 'Instructor',
      max_seats: session.max_seats,
      seats_booked: bookingsBySession[session.id] ?? 0,
      seats_available: Math.max(0, (session.max_seats ?? 0) - (bookingsBySession[session.id] ?? 0)),
      available: (session.max_seats ?? 0) - (bookingsBySession[session.id] ?? 0) > 0,
      deposit_cents: session.session_type?.deposit_cents ?? 0,
      price_cents: session.session_type?.price_cents ?? 0,
    }
  })

  return NextResponse.json({
    session_type: {
      id: (sessionType as unknown as SessionTypeRow).id,
      name: (sessionType as unknown as SessionTypeRow).name,
      duration_minutes: (sessionType as unknown as SessionTypeRow).duration_minutes,
      price_cents: (sessionType as unknown as SessionTypeRow).price_cents,
      deposit_cents: (sessionType as unknown as SessionTypeRow).deposit_cents,
      description: (sessionType as unknown as SessionTypeRow).description,
    },
    slots,
  })
}
