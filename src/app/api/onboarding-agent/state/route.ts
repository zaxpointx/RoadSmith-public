import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// ── Demo session helper ───────────────────────────────────────────
async function getDemoSession(): Promise<{ schoolId: string } | null> {
  const cookieStore = await cookies()
  const demoUserCookie = cookieStore.get('demo_user')
  if (!demoUserCookie?.value) return null
  try {
    const payload = JSON.parse(
      Buffer.from(demoUserCookie.value, 'base64').toString('utf8')
    )
    return payload?.schoolId ? { schoolId: payload.schoolId } : null
  } catch {
    return null
  }
}

/** Valid onboarding states */
const VALID_STATES = [
  'started',
  'students_import',
  'instructors_added',
  'session_types_set',
  'complete',
] as const

type OnboardingState = (typeof VALID_STATES)[number]

// ── GET /api/onboarding-agent/state ───────────────────────────────
// Returns current onboarding state + progress for the school
export async function GET() {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const session = await getDemoSession()
  if (!session) {
    return NextResponse.json({ error: 'No demo session' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Fetch the school's onboarding state from a metadata field or a dedicated onboarding_state table
  // We'll read from the school record's metadata first, fall back to a simple JSON field
  const { data: school, error } = await admin
    .from('schools')
    .select('onboarding_state, metadata')
    .eq('id', session.schoolId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching onboarding state:', error)
    // Graceful fallback — not critical
  }

  let state: string = 'started'
  const progress = {
    started: false,
    students_import: false,
    instructors_added: false,
    session_types_set: false,
    complete: false,
  }

  if (school?.onboarding_state) {
    state = String(school.onboarding_state)
    const stepOrder = ['started', 'students_import', 'instructors_added', 'session_types_set', 'complete']
    const idx = stepOrder.indexOf(state)
    if (idx >= 0) {
      progress.started = true
      progress.students_import = idx >= 1
      progress.instructors_added = idx >= 2
      progress.session_types_set = idx >= 3
      progress.complete = idx >= 4
    }
  }

  // Also check if student count / instructor count > 0 to auto-advance
  const [studentsResult, instructorsResult, sessionTypesResult] = await Promise.all([
    admin.from('students_driver_ed').select('id', { count: 'exact', head: true }).eq('school_id', session.schoolId),
    admin.from('instructors').select('id', { count: 'exact', head: true }).eq('school_id', session.schoolId).eq('active', true),
    admin.from('session_types').select('id', { count: 'exact', head: true }).eq('school_id', session.schoolId).eq('active', true),
  ])

  const studentCount = studentsResult.count ?? 0
  const instructorCount = instructorsResult.count ?? 0
  const sessionTypeCount = sessionTypesResult.count ?? 0

  return NextResponse.json({
    state,
    progress,
    counts: {
      students: studentCount,
      instructors: instructorCount,
      sessionTypes: sessionTypeCount,
    },
    schoolId: session.schoolId,
  })
}

// ── POST /api/onboarding-agent/state ──────────────────────────────
// Updates the onboarding state for a school
export async function POST(request: NextRequest) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const session = await getDemoSession()
  if (!session) {
    return NextResponse.json({ error: 'No demo session' }, { status: 401 })
  }

  const body = await request.json()
  const { state } = body as { state?: string }

  if (!state || !VALID_STATES.includes(state as OnboardingState)) {
    return NextResponse.json(
      { error: `Invalid state. Must be one of: ${VALID_STATES.join(', ')}` },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()

  // Update the school's onboarding_state column
  const { error } = await admin
    .from('schools')
    .update({ onboarding_state: state })
    .eq('id', session.schoolId)

  if (error) {
    console.error('Error updating onboarding state:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, state })
}
