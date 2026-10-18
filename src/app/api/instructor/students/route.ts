import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { decryptField } from '@/lib/security'

type InstructorStudent = {
  id: string
  legal_name: string | null
  dob: string | null
  permit_number: string | null
  parent_email: string | null
  classroom_hours: number | null
  driving_hours: number | null
  certificate_issued_at: string | null
  enrollment_date: string | null
  status: string | null
  created_at: string
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  instructor_id: string | null
}

// GET /api/instructor/students
// Returns only students assigned to the authenticated instructor.
// Demo mode: reads x-instructor-id header (set by middleware)
// Production: resolves instructor from auth session
export async function GET(request: Request) {
  const demoMode = process.env.DEMO_MODE === 'true'

  let instructorId: string | null = null
  let schoolId: string | null = null

  if (demoMode) {
    instructorId = request.headers.get('x-instructor-id')
    schoolId = request.headers.get('x-school-id')

    if (!instructorId || !schoolId) {
      return NextResponse.json({ error: 'Unauthorized — no instructor session' }, { status: 401 })
    }
  } else {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const { data: instructor } = await supabase
      .from('instructors')
      .select('id, name, school_id')
      .eq('email', user.email)
      .single()

    if (!instructor) {
      return new NextResponse('Instructor not found', { status: 404 })
    }

    instructorId = instructor.id
    schoolId = instructor.school_id
  }

  if (!instructorId || !schoolId) {
    return NextResponse.json({ error: 'Unauthorized — missing instructor scope' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Fetch students assigned to this instructor (filter by instructor_id)
  const { data: students, error: studentsError } = await (admin
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
      status,
      created_at,
      emergency_contact_name,
      emergency_contact_phone,
      instructor_id
    `)
    .eq('school_id', schoolId)
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false }) as unknown as Promise<{ data: InstructorStudent[] | null; error: { message: string } | null }>)

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 })
  }

  // Decrypt student names
  const decrypted = await Promise.all(
    (students ?? []).map(async (s) => ({
      id: s.id,
      legal_name: s.legal_name ? await decryptField(s.legal_name) : '[unknown]',
      dob: s.dob,
      permit_number: s.permit_number,
      parent_email: s.parent_email,
      classroom_hours: s.classroom_hours ?? 0,
      driving_hours: s.driving_hours ?? 0,
      certificate_issued_at: s.certificate_issued_at,
      enrollment_date: s.enrollment_date,
      status: s.status ?? 'pending',
      created_at: s.created_at,
      emergency_contact_name: s.emergency_contact_name,
      emergency_contact_phone: s.emergency_contact_phone ? await decryptField(s.emergency_contact_phone) : null,
      instructor_id: s.instructor_id,
    }))
  )

  return NextResponse.json(decrypted)
}
