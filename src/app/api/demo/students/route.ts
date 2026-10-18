import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { decryptField, encryptField } from '@/lib/security'

/** Get demo session info from demo_user cookie */
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
 * Demo-mode students endpoint.
 * Reads school_id from the demo_user cookie via Next.js cookies(),
 * then queries with service role key to bypass RLS.
 */
export async function GET() {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const session = await getDemoSession()
  if (!session) {
    return NextResponse.json({ error: 'No demo session' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Use actual column names from students_driver_ed table
  const { data: students, error } = await admin
    .from('students_driver_ed')
    .select(`
      id,
      legal_name,
      dob,
      permit_number,
      parent_email,
      classroom_hours,
      driving_hours,
      certificate_issued_at,
      enrollment_date,
      created_at,
      emergency_contact_name,
      emergency_contact_phone
    `)
    .eq('school_id', session.schoolId) as unknown as { data: unknown[] | null; error: { message: string } | null }

  if (error) {
    console.error('Demo students query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Decrypt names
  const decrypted = await Promise.all(
    (students ?? []).map(async (student) => {
      const s = student as { id: string; legal_name: string | null; dob: string | null; permit_number: string | null; parent_email: string | null; classroom_hours: number | null; driving_hours: number | null; certificate_issued_at: string | null; enrollment_date: string | null; created_at: string; emergency_contact_name: string | null; emergency_contact_phone: string | null }
      return ({
      id: s.id,
      legal_name: s.legal_name ? await decryptField(s.legal_name) : '[unknown]',
      dob: s.dob,
      permit_number: s.permit_number,
      parent_email: s.parent_email,
      classroom_hours: s.classroom_hours ?? 0,
      driving_hours: s.driving_hours ?? 0,
      certificate_issued_at: s.certificate_issued_at,
      enrollment_date: s.enrollment_date,
      created_at: s.created_at,
      emergency_contact_name: s.emergency_contact_name,
      emergency_contact_phone: s.emergency_contact_phone,
      })
    })
  )

  return NextResponse.json(decrypted)
}

/**
 * Create a student in demo mode (bypasses RLS with service role key).
 */
export async function POST(request: NextRequest) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo only' }, { status: 403 })
  }

  const session = await getDemoSession()
  if (!session) {
    return NextResponse.json({ error: 'No demo session' }, { status: 401 })
  }

  const body = await request.json()
  const { legal_name, dob, parent_email, emergency_contact_name, emergency_contact_phone } = body

  if (!legal_name) {
    return NextResponse.json({ error: 'legal_name is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('students_driver_ed')
    .insert({
      legal_name: await encryptField(legal_name),
      dob: dob || null,
      parent_email: parent_email || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      school_id: session.schoolId,
      enrollment_date: new Date().toISOString().split('T')[0],
      classroom_hours: 0,
      driving_hours: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Demo student insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Decrypt the returned legal_name
  return NextResponse.json({
    ...data,
    legal_name: await decryptField(data.legal_name),
  })
}