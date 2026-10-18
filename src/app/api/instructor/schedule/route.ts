import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

type ScheduleBooking = {
  id: string
  session_date: string | null
  session_time: string | null
  status: string
  student_name: string | null
  student_email: string | null
  location: string | null
  session_type: { name: string; duration_minutes: number; color: string | null } | null
}
type AvailabilityRow = { day_of_week: number; start_time: string; end_time: string; active: boolean }

// GET /api/instructor/schedule
// Returns the authenticated instructor's upcoming booked sessions + availability
export async function GET(request: Request) {
  const demoMode = process.env.DEMO_MODE === 'true'

  let instructorId: string | null = null
  let schoolId: string | null = null
  let instructorName: string | null = null

  if (demoMode) {
    // In demo mode, read from headers set by middleware
    instructorId = request.headers.get('x-instructor-id')
    schoolId = request.headers.get('x-school-id')

    if (!instructorId || !schoolId) {
      return NextResponse.json({ error: 'Unauthorized — no instructor session' }, { status: 401 })
    }

    // Resolve instructor name from demo data
    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: instructor } = await (admin
      .from('instructors')
      .select('name')
      .eq('id', instructorId)
      .single() as unknown as Promise<{ data: { name: string } | null }>)

    instructorName = instructor?.name ?? 'Instructor'
  } else {
    // Real auth: use established Supabase client
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    // Get instructor record for this user
    const { data: instructor } = await supabase
      .from('instructors')
      .select('id, name, school_id')
      .eq('email', user.email)
      .single()

    if (!instructor) {
      return new NextResponse('Instructor not found', { status: 404 })
    }

    instructorId = instructor.id
    schoolId = instructor.school_id
    instructorName = instructor.name
  }

  // Resolve instructor name if not already set (safety check)
  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get upcoming bookings for this instructor
  const { data: bookings, error: bookingsError } = await (admin
    .from('bookings')
    .select(`
      id,
      session_date,
      session_time,
      status,
      student_name,
      student_email,
      session_type:session_type_id(name, duration_minutes, color),
      location
    `)
    .eq('instructor_id', instructorId)
    .eq('status', 'confirmed')
    .gte('session_date', new Date().toISOString().split('T')[0])
    .order('session_date', { ascending: true })
    .order('session_time', { ascending: true })
    .limit(30) as unknown as Promise<{ data: ScheduleBooking[] | null; error: { message: string } | null }>)

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 })
  }

  // Decrypt student names
  let upcoming = bookings ?? []
  if (!demoMode && upcoming.length > 0) {
    try {
      const { decryptField } = await import('@/lib/security')
      upcoming = await Promise.all(upcoming.map(async (b) => ({
        ...b,
        student_name: b.student_name ? await decryptField(b.student_name) : null,
      })))
    } catch {
      // Fall through with encrypted names in non-demo mode
    }
  }

  // Get availability for this instructor
  const { data: availability } = await (admin
    .from('instructor_availability')
    .select('day_of_week, start_time, end_time, active')
    .eq('instructor_id', instructorId)
    .order('day_of_week', { ascending: true }) as unknown as Promise<{ data: AvailabilityRow[] | null }>)

  return NextResponse.json({
    instructor_id: instructorId,
    instructor_name: instructorName,
    school_id: schoolId,
    availability: availability ?? [],
    upcoming,
  })
}
