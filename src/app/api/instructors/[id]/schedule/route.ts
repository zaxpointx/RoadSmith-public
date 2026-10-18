import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: instructorId } = await params
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

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: instructor }, { data: availability }] = await Promise.all([
    supabaseAdmin.from('instructors').select('id, name, email, phone, active').eq('id', instructorId).single(),
    supabaseAdmin
      .from('instructor_availability')
      .select('day_of_week, start_time, end_time, active')
      .eq('instructor_id', instructorId)
      .order('day_of_week'),
  ])

  if (!instructor) return NextResponse.json({ error: 'Instructor not found' }, { status: 404 })

  return NextResponse.json({ instructor, availability: availability ?? [] })
}
