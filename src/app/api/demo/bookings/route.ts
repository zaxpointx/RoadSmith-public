import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/server'

async function getDemoSession() {
  const cookieStore = await cookies()
  const demoUserCookie = cookieStore.get('demo_user')
  if (!demoUserCookie?.value) return null
  try {
    const payload = JSON.parse(Buffer.from(demoUserCookie.value, 'base64').toString('utf8'))
    if (!payload?.schoolId) return null
    return payload as { schoolId: string; userId: string; email: string }
  } catch {
    return null
  }
}

/**
 * Demo-mode bookings endpoint.
 * GET ?student_id=... returns bookings for a specific student
 */
export async function GET(request: NextRequest) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const session = await getDemoSession()
  if (!session) return NextResponse.json({ error: 'No demo session' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('student_id')

  const admin = getSupabaseAdmin()

  let query = admin
    .from('bookings')
    .select(`id, session_date, session_time, status, payment_status, deposit_amount_cents, session_type:session_type_id(name), instructor:instructor_id(name)`)
    .eq('school_id', session.schoolId)
    .order('session_date', { ascending: false })

  if (studentId) {
    query = query.eq('student_id', studentId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
