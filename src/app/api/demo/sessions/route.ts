import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const cookieStore = await cookies()
  const demoUserCookie = cookieStore.get('demo_user')
  if (!demoUserCookie?.value) {
    return NextResponse.json({ error: 'No demo session' }, { status: 401 })
  }

  let payload: { schoolId?: string }
  try {
    payload = JSON.parse(Buffer.from(demoUserCookie.value, 'base64').toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid demo session' }, { status: 401 })
  }

  const schoolId = payload?.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'No school in demo session' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const [sessionsData, instructorsData, sessionTypesData] = await Promise.all([
    admin
      .from('sessions')
      .select('*, instructor:instructors(name), session_type:session_types(name)')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: false }),
    admin
      .from('instructors')
      .select('id, name')
      .eq('school_id', schoolId)
      .eq('active', true),
    admin
      .from('session_types')
      .select('id, name, duration_minutes')
      .eq('school_id', schoolId)
      .eq('active', true),
  ])

  return NextResponse.json({
    sessions: sessionsData.data || [],
    instructors: instructorsData.data || [],
    sessionTypes: sessionTypesData.data || [],
  })
}
