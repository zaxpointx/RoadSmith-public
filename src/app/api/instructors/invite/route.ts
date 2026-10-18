import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const demoMode = process.env.DEMO_MODE === 'true'

  // ── Auth ────────────────────────────────────────────────────────────────
  if (demoMode) {
    // In demo mode, trust x-school-id — dashboard is already authenticated
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

  const { instructorId } = await request.json()
  if (!instructorId) return NextResponse.json({ error: 'instructorId required' }, { status: 400 })

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get instructor email
  const { data: instructor } = await supabaseAdmin
    .from('instructors')
    .select('id, email, name, school_id')
    .eq('id', instructorId)
    .single()

  if (!instructor) return NextResponse.json({ error: 'Instructor not found' }, { status: 404 })

  // Generate magic link for the instructor
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/instructor/schedule?instructor_id=${instructorId}&school=${instructor.school_id}`

  // In production, send real magic link via Supabase auth
  if (!demoMode) {
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: instructor.email,
      options: {
        redirectTo: inviteUrl,
      },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, hint: 'Magic link sent to instructor email' })
  }

  // DEMO_MODE: just log it and return the URL
  console.log(`[DEMO_MODE] Instructor magic link for ${instructor.email}: ${inviteUrl}`)
  return NextResponse.json({
    success: true,
    demo_url: inviteUrl,
    hint: 'DEMO_MODE — real email not sent. Use demo_url to access the instructor schedule page.',
  })
}
