import { NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { encryptField, decryptField, validateDOB, validatePermitNumber, validatePhone, auditLog } from '@/lib/security'
import { isLikelyValidEmail } from '@/lib/email'
import { validateRequired } from '@/lib/validation'
import type { StudentsDriverEd, AuditLog } from '@/lib/supabase/types'

// Workaround: Supabase-generated types only include tables known at codegen time.
// For admin operations on tables not in generated types, we fall back to untyped .from()
// and use type assertions to keep TypeScript happy.
type AdminFrom = {
  from(table: 'students_driver_ed'): {
    insert(values: StudentsDriverEd): {
      select(): { single(): Promise<{ data: StudentsDriverEd | null; error: unknown }> }
    }
  }
  from(table: 'audit_logs'): {
    insert(values: AuditLog): Promise<unknown>
  }
}

type StudentListRow = {
  id: string
  legal_name: string | null
  created_at: string
  driving_hours: number | null
  classroom_hours: number | null
  certificate_issued_at: string | null
  parent_email: string | null
  instructor_id: string | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const schoolId = searchParams.get('school_id')

  if (!schoolId) {
    return NextResponse.json({ error: 'Missing school_id' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getSupabaseAdmin()

  // Verify school ownership with the authenticated user, then use the admin
  // client for student rows so RLS cannot silently collapse the result to [].
  const { data: school, error: schoolError } = await admin
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .eq('owner_email', user.email)
    .maybeSingle()

  if (schoolError) return NextResponse.json({ error: schoolError.message }, { status: 500 })
  if (!school) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: students, error } = await admin
    .from('students_driver_ed')
    .select('id, legal_name, created_at, driving_hours, classroom_hours, certificate_issued_at, parent_email, instructor_id')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false }) as { data: StudentListRow[] | null; error: { message: string } | null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Decrypt names server-side for admin view
  const decrypted = await Promise.all(
    (students ?? []).map(async (s) => ({
      id: s.id,
      legal_name: s.legal_name ? await decryptField(s.legal_name) : '[unknown]',
      created_at: s.created_at,
      driving_hours: s.driving_hours ?? 0,
      classroom_hours: s.classroom_hours ?? 0,
      certificate_issued_at: s.certificate_issued_at,
      parent_email: s.parent_email,
      instructor_id: s.instructor_id,
    }))
  )

  return NextResponse.json(decrypted)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // DEMO_MODE: school_id validated by middleware via demo_session cookie
  // Production: derive from authenticated session metadata
  let schoolId = request.headers.get('x-school-id')
  if (!schoolId) {
    schoolId = user.user_metadata?.school_id
  }
  if (!schoolId) return new NextResponse('Missing school_id', { status: 400 })

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .eq('owner_email', user.email)
    .single()
  if (!school) return new NextResponse('Forbidden', { status: 403 })

  const body = await request.json()
  validateRequired(body, ['legal_name', 'dob'])
  const { legal_name, dob, permit_number, parent_email, emergency_contact_name, emergency_contact_phone } = body

  if (!legal_name || !dob) {
    return NextResponse.json({ error: 'legal_name and dob are required' }, { status: 400 })
  }

  const dobCheck = validateDOB(dob)
  if (!dobCheck.valid) return NextResponse.json({ error: dobCheck.error }, { status: 400 })

  if (permit_number) {
    const p = validatePermitNumber(permit_number)
    if (!p.valid) return NextResponse.json({ error: p.error }, { status: 400 })
  }
  if (parent_email && !isLikelyValidEmail(parent_email)) {
    return NextResponse.json({ error: 'Invalid or disallowed email address' }, { status: 400 })
  }
  if (emergency_contact_phone) {
    const p = validatePhone(emergency_contact_phone)
    if (!p.valid) return NextResponse.json({ error: p.error }, { status: 400 })
  }

  const encryptedName = await encryptField(legal_name)
  const encryptedPermit = permit_number ? await encryptField(permit_number) : 'PENDING'
  const encryptedPhone = emergency_contact_phone ? await encryptField(emergency_contact_phone) : null

  // Cast admin client to typed interface that covers our tables
  const admin = getSupabaseAdmin() as unknown as AdminFrom

  const studentData = {
    school_id: schoolId,
    legal_name: encryptedName,
    dob,
    permit_number: encryptedPermit,
    parent_email: parent_email ?? '',
    emergency_contact_name: emergency_contact_name ?? '',
    emergency_contact_phone: encryptedPhone,
  }

  const { data: student, error } = await admin
    .from('students_driver_ed')
    .insert(studentData as StudentsDriverEd)
    .select()
    .single()

  if (error) return NextResponse.json({ error: (error as { message?: string }).message ?? 'Insert failed' }, { status: 500 })

  const logEntry = auditLog('STUDENT_CREATED', user.id, {
    student_id: (student as StudentsDriverEd).id,
    school_id: schoolId,
    has_permit: Boolean(permit_number),
  })

  await admin.from('audit_logs').insert(logEntry as AuditLog)

  return NextResponse.json({ id: (student as StudentsDriverEd).id, legal_name }, { status: 201 })
}
