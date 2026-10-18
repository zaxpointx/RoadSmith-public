import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { auditLog } from '@/lib/security'
import { validateRequired } from '@/lib/validation'

// ── GET /api/sessions?school_id=X ──────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const schoolId = searchParams.get('school_id')
  if (!schoolId) return new NextResponse('Missing school_id', { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // Ownership check: user must own this school
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .eq('owner_email', user.email)
    .single()
  if (!school) return new NextResponse('Forbidden', { status: 403 })

  const admin = getSupabaseAdmin() as unknown as SupabaseClient
  const { data: sessions, error } = await admin
    .from('sessions')
    .select('*, instructor:instructors(id, name)')
    .eq('school_id', schoolId)
    .order('start_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(sessions ?? [])
}

// ── POST /api/sessions ─────────────────────────────────────────────────
export async function POST(request: Request) {
  const body = await request.json()
  validateRequired(body, ['start_date', 'end_date', 'max_seats'])
  const { start_date, end_date, instructor_id, max_seats, price_cents, location, session_type_id } = body

  const admin = getSupabaseAdmin() as unknown as SupabaseClient
  let schoolId = request.headers.get('x-school-id')

  // DEMO_MODE: derive school_id from demo cookie — do NOT trust x-school-id header
  if (process.env.DEMO_MODE === 'true') {
    const cookieStore = await cookies()
    const demoUserCookie = cookieStore.get('demo_user')
    if (!demoUserCookie?.value) {
      return NextResponse.json({ error: 'No demo session' }, { status: 401 })
    }
    try {
      const payload = JSON.parse(Buffer.from(demoUserCookie.value, 'base64').toString('utf8'))
      schoolId = payload?.schoolId
    } catch {
      return NextResponse.json({ error: 'Invalid demo session' }, { status: 401 })
    }
    if (!schoolId) return NextResponse.json({ error: 'No school in demo session' }, { status: 400 })

    const { data: session, error } = await admin
      .from('sessions')
      .insert({
        school_id: schoolId,
        start_date: body.start_date,
        end_date: body.end_date,
        instructor_id: body.instructor_id ?? null,
        max_seats: Math.max(1, Math.min(100, body.max_seats ?? 1)),
        price_cents: body.price_cents ?? 0,
        location: body.location ?? '',
        session_type_id: body.session_type_id ?? null,
        seats_booked: 0,
        status: 'scheduled',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(session, { status: 201 })
  }

  // Non-demo: require auth + ownership
  if (!schoolId) return NextResponse.json({ error: 'Missing x-school-id' }, { status: 400 })
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return new NextResponse('Unauthorized', { status: 401 })
  const token = authHeader.slice(7)
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return new NextResponse('Invalid token', { status: 401 })

  const { data: school } = await admin
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .eq('owner_email', user.email)
    .single()
  if (!school) return new NextResponse('Forbidden', { status: 403 })

  const sessionDate = new Date(start_date)
  if (sessionDate <= new Date()) {
    return NextResponse.json({ error: 'Session must be in the future' }, { status: 400 })
  }

  const { data: session, error } = await admin
    .from('sessions')
    .insert({
      school_id: schoolId,
      start_date,
      end_date,
      instructor_id: instructor_id ?? null,
      max_seats: Math.max(1, Math.min(100, max_seats)),
      price_cents: price_cents ?? 0,
      location: location ?? '',
      session_type_id: session_type_id ?? null,
      seats_booked: 0,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('audit_logs').insert(
    auditLog('SESSION_CREATED', user.id, { session_id: session.id, school_id: schoolId, instructor_id })
  )

  return NextResponse.json(session, { status: 201 })
}
