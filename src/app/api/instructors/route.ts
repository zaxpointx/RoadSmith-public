import { NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { auditLog } from '@/lib/security'
import { validateRequired } from '@/lib/validation'
import { cookies } from 'next/headers'
import type { Instructor } from '@/lib/supabase/types'

// ── GET /api/instructors?school_id=X ─────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const schoolId = searchParams.get('school_id')

  if (!schoolId) {
    return new NextResponse('Missing school_id', { status: 400 })
  }

  // DEMO_MODE: use service role to bypass RLS and auth
  if (process.env.DEMO_MODE === 'true') {
    const admin = getSupabaseAdmin()
    const { data: instructors, error } = await admin
      .from('instructors')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: true })
    if (error) {
      return NextResponse.json({ error: (error as { message?: string }).message ?? String(error) }, { status: 500 })
    }
    return NextResponse.json(instructors ?? [])
  }

  const supabase = await createClient()
  const { data: instructors, error } = await supabase
    .from('instructors')
    .select('*')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('created_at', { ascending: true }) as { data: Instructor[] | null, error: unknown }

  if (error) {
    return NextResponse.json({ error: (error as { message?: string }).message ?? String(error) }, { status: 500 })
  }

  return NextResponse.json(instructors ?? [])
}

// ── POST /api/instructors ─────────────────────────────────────────────────
export async function POST(request: Request) {
  const body = await request.json()
  validateRequired(body, ['name'])
  const { name, email, phone, license_number, license_expiry } = body

  let schoolId = request.headers.get('x-school-id')
  let userId: string | null = null

  // DEMO_MODE: derive school_id from demo cookie
  if (process.env.DEMO_MODE === 'true') {
    const cookieStore = await cookies()
    const demoUserCookie = cookieStore.get('demo_user')
    if (!demoUserCookie?.value) {
      return NextResponse.json({ error: 'No demo session' }, { status: 401 })
    }
    try {
      const payload = JSON.parse(Buffer.from(demoUserCookie.value, 'base64').toString('utf8'))
      schoolId = payload?.schoolId
      userId = payload?.userId ?? null
    } catch {
      return NextResponse.json({ error: 'Invalid demo session' }, { status: 401 })
    }
    if (!schoolId) return NextResponse.json({ error: 'No school in demo session' }, { status: 400 })
  } else {
    // Non-demo: require real auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })
    if (!schoolId) return new NextResponse('Missing x-school-id', { status: 400 })
    userId = user.id
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: instructor, error } = await supabaseAdmin
    .from('instructors')
    .insert({
      school_id: schoolId,
      name,
      email: email ?? null,
      phone: phone ?? null,
      license_number: license_number ?? null,
      license_expiry: license_expiry ?? null,
      active: true,
    })
    .select()
    .single() as { data: Instructor, error: unknown }

  if (error) return NextResponse.json({ error: (error as { message?: string }).message ?? String(error) }, { status: 500 })

  // Only audit log in non-demo mode (demo has no real user)
  if (userId) {
    await supabaseAdmin.from('audit_logs').insert(
      auditLog('INSTRUCTOR_CREATED', userId, {
        instructor_id: instructor.id,
        school_id: schoolId,
        name,
        license_expiry,
      })
    )
  }

  return NextResponse.json(instructor, { status: 201 })
}
