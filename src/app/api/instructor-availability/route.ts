import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

// ── GET instructor's own availability, or owner's view of an instructor's availability ──

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const instructorId = searchParams.get('instructor_id')

  if (!instructorId) {
    return NextResponse.json({ error: 'instructor_id query param required' }, { status: 400 })
  }

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabaseAdmin
    .from('instructor_availability')
    .select('id, instructor_id, day_of_week, start_time, end_time, active')
    .eq('instructor_id', instructorId)
    .order('day_of_week', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ availability: data ?? [] })
}

// ── PUT replaces all availability for an instructor ──
// Body: { instructor_id, availability: [{ day_of_week, start_time, end_time, active }] }

export async function PUT(request: NextRequest) {
  const demoMode = process.env.DEMO_MODE === 'true'

  if (demoMode) {
    const schoolId = request.headers.get('x-school-id')
    if (!schoolId) return NextResponse.json({ error: 'Missing x-school-id' }, { status: 400 })
  } else {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { instructor_id, availability } = body

  if (!instructor_id || !Array.isArray(availability)) {
    return NextResponse.json({ error: 'instructor_id and availability[] required' }, { status: 400 })
  }

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Delete existing availability for this instructor
  await supabaseAdmin
    .from('instructor_availability')
    .delete()
    .eq('instructor_id', instructor_id)

  // Insert new availability (only active days)
  const toInsert = availability
    .filter((day: { active?: unknown }) => Boolean(day.active))
    .map((day: { day_of_week: number; start_time: string; end_time: string }) => ({
      instructor_id,
      day_of_week: day.day_of_week,
      start_time: day.start_time,
      end_time: day.end_time,
      active: true,
    }))

  if (toInsert.length > 0) {
    const { error } = await supabaseAdmin
      .from('instructor_availability')
      .insert(toInsert)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, days_saved: toInsert.length })
}
