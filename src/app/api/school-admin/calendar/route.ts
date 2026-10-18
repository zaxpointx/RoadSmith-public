import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { resolveSchoolAdminContext } from '@/lib/school-admin/auth'

function defaultStart() {
  const date = new Date()
  const day = date.getDay()
  date.setDate(date.getDate() - day)
  return date.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const context = await resolveSchoolAdminContext(request)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') ?? defaultStart()
  const end = searchParams.get('end')
  const instructorId = searchParams.get('instructor_id')
  const computedEnd = end ?? (() => {
    const date = new Date(`${start}T12:00:00`)
    date.setDate(date.getDate() + 7)
    return date.toISOString().slice(0, 10)
  })()

  const admin = getSupabaseAdmin() as unknown as SupabaseClient
  let query = admin
    .from('sessions')
    .select('id, start_date, start_time, end_date, max_seats, seats_booked, status, location, instructor:instructors(id, name), session_type:session_types(id, name, duration_minutes, color)')
    .eq('school_id', context.schoolId)
    .gte('start_date', start)
    .lt('start_date', computedEnd)
    .order('start_date', { ascending: true })

  if (instructorId) query = query.eq('instructor_id', instructorId)

  const [sessionsResult, instructorsResult] = await Promise.all([
    query,
    admin.from('instructors').select('id, name, active').eq('school_id', context.schoolId).order('name', { ascending: true }),
  ])

  if (sessionsResult.error) return NextResponse.json({ error: sessionsResult.error.message }, { status: 500 })
  return NextResponse.json({
    weekStart: start,
    weekEnd: computedEnd,
    sessions: sessionsResult.data ?? [],
    instructors: instructorsResult.data ?? [],
  })
}
